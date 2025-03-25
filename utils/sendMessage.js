const fs = require("fs");
const uuid = require("uuid");
const { google } = require("googleapis");

const DISCOVERY_URL =
  "https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1";
const { Message, TYPES } = require("../models/message");
const mongoose = require("mongoose");
const { ChatGroup } = require("../models/chatGroup");
const { PrivateChat } = require("../models/privateChat");
const { User } = require("../models/user");

async function joinChatGroups(socket, user, io) {
  const groups = await findUserChatGroups(user._id);

  groups.forEach((group) => {
    socket.join(group._id.toString());
  });
}

async function findUserChatGroups(userId) {
  return ChatGroup.find(
    {
      $or: [
        { "members.member": new mongoose.Types.ObjectId(userId) },
        { groupOwner: new mongoose.Types.ObjectId(userId) }
      ],
    }
  );
}

async function analyzeMessageContent(content, io) {
  const client = await google.discoverAPI(DISCOVERY_URL);
  const analyzeRequest = {
    comment: {
      text: content,
    },
    requestedAttributes: {
      TOXICITY: {},
      THREAT: {},
    },
  };

  return new Promise((resolve, reject) => {
    client.comments.analyze(
      {
        key: process.env.GOOGLE_API_KEY,
        resource: analyzeRequest,
      },
      (err, response) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(response);
      }
    );
  });
}

async function handleSendMessage(socket, user, message, chatId, io, userSockets) {
  if (!message) return;
  if (message.chatType === "group") {
    await handleGroupMessage(socket, user, message, chatId, io);
  } else {
    await handlePrivateMessage(socket, user, message, chatId, io, userSockets);
  }
}

async function handleGroupMessage(socket, user, message, chatId, io) {
  const chatGroup = await ChatGroup.findById(chatId);

  if (!chatGroup || !isUserMemberOfGroup(chatGroup, user._id)) {
    console.log("not authorized");
    socket.emit("notAuthorized");
    return;
  }

  try {
    await analyzeMessageContent(message.content, io);

    const messageObject = new Message({
      sender: user._id,
      messageType: TYPES.TEXT,
      content: message.content,
      chatType: "group",
      chatGroup: chatId,
    });

    const newMessage = await (
      await messageObject.save()
    ).populate("sender", "firstName lastName avatar");

    io.to(chatId.toString()).emit("newMessage", newMessage);
  } catch (error) {
    console.log(error);
  }
}

async function handlePrivateMessage(socket, user, message, chatId, io, userSockets) {
  try {
    // const privateChat = await findPrivateChat(user, receiverId);
    const privateChat = await PrivateChat.findOne({
      _id: new mongoose.Types.ObjectId(chatId),
      $or: [
        { user1: user._id },
        { user2: user._id }
      ]
    }).populate("user1 user2");

    if (!privateChat)
      await analyzeMessageContent(message.content, io);

    const messageObject = new Message({
      sender: user._id,
      messageType: TYPES.TEXT,
      content: message.content,
      chatType: "private",
      privateChat: privateChat._id
    });

    const newMessage = await (await messageObject.save()).populate("sender", "firstName lastName avatar");
    const participants = [userSockets.get(privateChat.user1._id.toString()), userSockets.get(privateChat.user2._id.toString())];
    io.to(participants).emit("newMessage", newMessage);
  } catch (error) {
    // Handle the error appropriately, e.g., throw or send an error response
    console.error(error);
  }
}

function isUserMemberOfGroup(chatGroup, userId) {
  if (chatGroup.groupOwner.equals(userId))
    return true;
  return !!chatGroup.members.find(({ member }) => member.equals(userId));
}

// async function findPrivateChat(sender, receiver , chatId) {
//   return PrivateChat.findOne({
//     _id: ,
//     $or: [
//       { user1: sender, user2: receiver },
//       { user1: receiver, user2: sender },
//     ],
//   });
// }

// async function createPrivateChat(user1, user2) {
//   const privateChatObject = new PrivateChat({
//     user1,
//     user2,
//   });

//   return privateChatObject.save();
// }

function setupSendMessageEvent(socket, user, io, userSockets) {
  socket.on("sendMessage", async (message, chatId) => {
    await handleSendMessage(socket, user, message, chatId, io, userSockets);
  });
}

function setupUploadFileEvent(socket, user, io, userSockets) {
  socket.on("uploadFile", async ({ fileName, size, data, chatType }, chatId) => {
    if (!fileName || !data || !size || !data || !chatType) return;

    const uniqueFileName =
      uuid.v4() + "~" + fileName.replace(/\s/g, "_");
    const writeStream = fs.createWriteStream(`files/${uniqueFileName}`);
    let receivedSize = 0;

    data.forEach((chunk) => {
      writeStream.write(chunk);
      receivedSize += chunk.length;

      socket.emit("uploadProgress", {
        fileName,
        progress: (receivedSize / size) * 100,
      });
    });

    let messageObject;
    let to;

    if (chatType === "group") {
      const chatGroup = await ChatGroup.findById(chatId);
      if (!chatGroup || !isUserMemberOfGroup(chatGroup, user._id)) {
        socket.emit("notAuthorized");
        return;
      }

      to = chatId.toString();

      messageObject = new Message({
        sender: user._id,
        messageType: TYPES.FILE,
        uniqueFileName: uniqueFileName,
        originalFileName: fileName,
        chatType: chatType,
        chatGroup: chatId,
      });



    } else if (chatType === "private") {
      const privateChat = await PrivateChat.findOne({
        _id: new mongoose.Types.ObjectId(chatId),
        $or: [
          { user1: user._id },
          { user2: user._id }
        ]
      });

      if (!privateChat) {
        console.log("not authorized");
        return;
      }

      to = [userSockets.get(privateChat.user1.toString()), userSockets.get(privateChat.user2.toString())];

      messageObject = new Message({
        sender: user._id,
        messageType: TYPES.FILE,
        uniqueFileName: uniqueFileName,
        originalFileName: fileName,
        chatType: chatType,
        privateChat: chatId,
      });

    } else {
      return;
    }

    const newMessage = await (await messageObject.save()).populate(
      "sender",
      "firstName lastName avatar"
    );

    writeStream.end();
    socket.emit("uploadComplete", { fileName });
    console.log(newMessage);
    io.to(to).emit("newMessage", newMessage);
  });
}


module.exports = {
  setupSendMessageEvent,
  setupUploadFileEvent,
  joinChatGroups,
};
