const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    claimTreshold: String,
    rewardClaimed: Boolean,
    btnText: String,
    taskText: String,
    taskPoints: Number,
    taskCategory: String,
    taskUrl: String
});

const Task = mongoose.model("Task", TaskSchema);
module.exports = Task;
