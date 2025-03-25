const router = require("express").Router();
const { Classe } = require("../models/classe");
const { PrivateChat } = require("../models/privateChat");
const { Message } = require("../models/message");
const { User, ROLES } = require("../models/user");
const mongoose = require("mongoose");
const Joi = require("joi")

router.post("/", async (req, res) => {
  try {
    const schema = Joi.object({
      message: Joi.string().required(),
      userId: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const privateChat = await PrivateChat.findOne(
      {
        $or: [
          { user1: new mongoose.Types.ObjectId(req.session.user._id), user2: new mongoose.Types.ObjectId(req.body.userId) },
          { user1: new mongoose.Types.ObjectId(req.body.userId), user2: new mongoose.Types.ObjectId(req.session.user._id) }
        ]
      }
    );
    if (privateChat) {
      let message = new Message({
        content: req.body.message,
        sender: req.session.user._id,
        privateChat: privateChat._id,
        messageType: "text",
        chatType: "private",
      });
      message = await message.save();
      return res.status(200).send(message);
    } else {
      let privateChat = new PrivateChat({
        user1: req.session.user._id,
        user2: req.body.userId
      });
      privateChat = await privateChat.save();
      let message = new Message({
        content: req.body.message,
        sender: req.session.user._id,
        privateChat: privateChat._id,
        messageType: "text",
        chatType: "private",
      });
      message = await message.save();
      return res.status(200).send(message);
    }
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});



router.get("/", async (req, res) => {
  try {
    let user = await User.findById(req.session.user._id);
    // let user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("Aucun utilisateur");
    let chat = await PrivateChat.aggregate([
      {
        $match: {
          $or: [
            { user1: user._id },
            { user2: user._id }
          ]
        }
      },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "privateChat",
          as: "messages"
        }
      },
      {
        $unwind: {
          path: "$messages",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "messages.sender",
          foreignField: "_id",
          as: "sender"
        }
      },
      {
        $unwind: {
          path: "$sender",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          user: {
            $first: {
              $cond: [
                { $eq: ["$user1", user._id] },
                "$user2",
                "$user1"
              ]
            }
          },
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
                  uniqueFileName: "$messages.uniqueFileName",
                  sender: {
                    _id: "$sender._id",
                    firstName: "$sender.firstName",
                    lastName: "$sender.lastName",
                    avatar: "$sender.avatar"
                  }
                },
                null
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          isPrivate: true
        }
      },
      {
        $project: {
          _id: 1,
          isPrivate: 1,
          user: {
            _id: "$userInfo._id",
            firstName: "$userInfo.firstName",
            lastName: "$userInfo.lastName",
            avatar: "$userInfo.avatar",
          },
          messages: {
            $filter: {
              input: "$messages",
              as: "message",
              cond: { $ne: ["$$message", null] }
            }
          }
        }
      }
    ]

    );
    return res.status(200).send(chat);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/users", async (req, res) => {
  try {
    let user = await User.findById(req.session.user._id);
    if (!user) return res.status(404).send("Aucun utilisateur");
    let users = await User.find({
      role:
        user.role === ROLES.TEACHER || user.role === ROLES.ADMIN
          ? { $in: [ROLES.TEACHER, ROLES.ADMIN, ROLES.STUDENT, ROLES.TUTOR] }
          : { $in: [ROLES.TEACHER, ROLES.ADMIN] },

      _id: { $ne: user._id },
    });

    if (user.role === ROLES.STUDENT) {
      students = await Classe.findOne({ students: user._id })
        .select("students")
        .populate("students", "-password");
      if (students)
        students.students.forEach((student) => {
          if (student._id.toString() !== user._id.toString()) {
            users.push(student);
          }
        });
    }
    return res.status(200).send(users);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
