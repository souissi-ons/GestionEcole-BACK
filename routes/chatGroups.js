const router = require("express").Router();
const { ChatGroup, ROLES } = require("../models/chatGroup");
const Joi = require("joi");
const { Classe } = require("../models/classe");
const { User } = require("../models/user");
const Message = require("../models/message");
const mongoose = require("mongoose");
const checkAdultContentMiddleware = require("../middlewares/checkAdultContent");
const { upload } = require("../middlewares/upload");
const fs = require("fs").promises;

router.post("/", async (req, res) => {
  try {
    const schema = Joi.object({
      groupOwner: Joi.string().required(),
      groupName: Joi.string().required(),
      groupMembers: Joi.array().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let chatGroup = new ChatGroup({
      groupOwner: req.session.user._id,
      groupName: req.body.groupName,
      members: req.body.groupMembers.map((member) => ({
        member: new mongoose.Types.ObjectId(member),
        role: ROLES.MEMBER,
      }))
    });
    chatGroup = await chatGroup.save();
    return res.status(200).send(chatGroup);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/", async (req, res) => {
  try {
    let user = await User.findById(req.session.user._id);
    // let user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("Aucun utilisateur");
    let chat = await ChatGroup.aggregate([
      {
        $match: {
          $expr: {
            $or: [
              { $in: [user._id, "$members.member"] },
              { $eq: [user._id, "$groupOwner"] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "chatGroup",
          as: "messages",
        },
      },
      {
        $unwind: {
          path: "$messages",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members.member",
          foreignField: "_id",
          as: "members",
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "messages.sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $unwind: {
          path: "$sender",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          createdAt: { $first: "$createdAt" },
          name: { $first: "$groupName" },
          image: { $first: "$image" },
          groupOwner: { $first: "$groupOwner" },
          members: { $first: "$members" },
          messages: {
            $push: {
              $cond: [
                { $ifNull: ["$messages", false] },
                {
                  content: "$messages.content",
                  type: "$messages.type",
                  createdAt: "$messages.createdAt",
                  originalFileName: "$messages.originalFileName",
                  messageType: "$messages.messageType",
                  chatType: "$messages.chatType",
                  uniqueFileName: "$messages.uniqueFileName",
                  sender: {
                    _id: "$sender._id",
                    firstName: "$sender.firstName",
                    lastName: "$sender.lastName",
                    avatar: "$sender.avatar",
                  },
                },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          name: 1,
          image: 1,
          groupOwner: 1,
          members: 1,
          messages: {
            $filter: {
              input: "$messages",
              as: "message",
              cond: { $ne: ["$$message", null] },
            },
          },
        },
      },
      {
        $addFields: {
          isGroup: true
        }
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          isGroup: 1,
          name: 1,
          image: 1,
          groupOwner: 1,
          members: 1,
          messages: {
            $cond: {
              if: { $gt: [{ $size: "$messages" }, 0] },
              then: "$messages",
              else: [],
            },
          },
        },
      },
    ]);
    return res.status(200).send(chat);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.put(
  "/:id/change-image",
  [upload.single("image"), checkAdultContentMiddleware],
  async (req, res) => {
    try {
      const chatGroup = await ChatGroup.findById(req.params.id);
      if (!chatGroup) {
        await fs.unlink(req.file.path);
        return res.status(404).send("Group not found");
      }
      // Update the chatGroup's avatar with the uploaded file information
      chatGroup.image = req.file.filename;

      // Save the updated chatGroup to the database
      await chatGroup.save();
      res.status(200).send(chatGroup.image);
    } catch (error) {
      res.status(500).send(`Internal server error: ${error.message}`);
    }
  }
);

router.put("/:id/change-name", async (req, res) => {
  try {
    const schema = Joi.object({
      groupName: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let chatGroup = await ChatGroup.findById(req.params.id);
    if (!chatGroup) return res.status(404).send("Chat group not found");
    chatGroup.groupName = req.body.groupName;
    chatGroup = await chatGroup.save();
    res.status(200).send(chatGroup);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.post("/:id/add-members", async (req, res) => {
  const schema = Joi.object({
    members: Joi.array().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  try {
    let chatGroup = await ChatGroup.findById(req.params.id);
    if (!chatGroup) return res.status(404).send("Chat group not found");
    chatGroup.members.push(
      ...req.body.members.map((member) => ({ member, role: ROLES.MEMBER }))
    );
    chatGroup = await chatGroup.save();
    res.status(200).send(chatGroup);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.delete("/:groupId/members/:memberId", async (req, res) => {
  const { groupId, memberId } = req.params;
  try {
    let chatGroup = await ChatGroup.findByIdAndUpdate(groupId, {
      $pull: { members: { member: memberId } },
    });
    if (!chatGroup) return res.status(404).send("Chat group not found");
    res.status(200).send(chatGroup);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.delete("/:id/quit", async (req, res) => {
  try {
    const chatGroup = await ChatGroup.findOne({ _id: req.params.id, "members.member": req.session.user._id });
    if (!chatGroup) return res.status(404).send("Chat group not found");

    chatGroup.members = chatGroup.members.filter(member => member.member != req.session.user._id);
    await chatGroup.save();
    return res.sendStatus(200);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const chatGroup = await ChatGroup.findById({ _id: req.params.id });
    if (!chatGroup) return res.status(404).send("Chat group not found");
    if (chatGroup.groupOwner == req.session.user._id) {
      await chatGroup.deleteOne();
    }
    if (chatGroup.image)
      await fs.unlink("../back/images/" + chatGroup.image)
    await Message.deleteMany({ chatGroup: req.params.id });
    return res.status(200).send(chatGroup);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
