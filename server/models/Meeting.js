const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema({
  meetingId: { type: String, unique: true }, // UUID
  title: String,
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  startTime: Date,
  endTime: Date,
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("Meeting", MeetingSchema);