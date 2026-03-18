const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Sentiment = require("sentiment");
const cron = require("node-cron");
const fetchEmails = require("./emailFetcher.cjs");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function getAITone(text){
  const response = await fetch("http://localhost:8000/analyze-tone",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text })
  });

  const data = await response.json();
  return data.emotion;
}

async function detectConflictType(text){

  const lower = text.toLowerCase();

  if(lower.includes("deadline") || lower.includes("task"))
    return "Task Conflict";

  if(lower.includes("manager") || lower.includes("boss"))
    return "Manager vs Employee Conflict";

  if(lower.includes("client"))
    return "Client Conflict";

  if(lower.includes("team") || lower.includes("colleague"))
    return "Peer Conflict";

  return "General Conflict";
}

const app = express();
app.use(cors());
app.use(express.json());

const sentiment = new Sentiment();

mongoose.connect("mongodb://127.0.0.1:27017/conflictDB")
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

const conversationSchema = new mongoose.Schema({
  conflictType:String,
  user1ID:String,
  user2ID:String,
  user1Message:String,
  user2Message:String,
  probability:Number,
  intensity:String,
  emotion1:String,
  emotion2:String
});

const Conversation = mongoose.model("Conversation",conversationSchema);

function detectTriggers(message){

  if(!message) return [];

  const words = message.toLowerCase().split(/\s+/);
  let triggers=[];

  words.forEach(word=>{
    const clean = word.replace(/[.,!?]/g,"");
    const score = sentiment.analyze(clean).score;

    if(score < 0){
      triggers.push(clean);
    }
  });

  return triggers;
}

function calculateConflict(s1,s2,tr1,tr2){

  let neg1 = s1.score < 0 ? Math.abs(s1.score) : 0;
  let neg2 = s2.score < 0 ? Math.abs(s2.score) : 0;

  let negScore = ((neg1 + neg2) / 2) * 20;

  let triggerBoost = (tr1.length + tr2.length) * 10;

  let probability = negScore + triggerBoost;

  if(probability > 95) probability = 95;
  if(probability < 5) probability = 5;

  return Math.floor(probability);
}

function intensity(prob){

  if(prob > 80) return "Severe Conflict";
  if(prob > 60) return "High Conflict";
  if(prob > 40) return "Moderate Conflict";

  return "Healthy Interaction";
}

app.post("/analyze", async(req,res)=>{

  let {conflictType,user1ID,user2ID,user1Message,user2Message}=req.body;

  if(!conflictType){
    conflictType = await detectConflictType(user1Message);
  }

  const s1 = sentiment.analyze(user1Message);
  const s2 = user2Message ? sentiment.analyze(user2Message) : {score:0};

  const emotion1 = await getAITone(user1Message);
  const emotion2 = user2Message
    ? await getAITone(user2Message)
    : "Unknown";

  const triggers1 = detectTriggers(user1Message);
  const triggers2 = detectTriggers(user2Message);

  const probability = calculateConflict(s1,s2,triggers1,triggers2);
  const intensityLevel = intensity(probability);

  const convo = new Conversation({
    conflictType,
    user1ID,
    user2ID,
    user1Message,
    user2Message,
    probability,
    intensity:intensityLevel,
    emotion1,
    emotion2
  });

  await convo.save();

  res.json({
    probability,
    intensity:intensityLevel,
    emotion1,
    emotion2,
    triggers1,
    triggers2
  });

});

app.get("/emails", async (req,res)=>{

  try{

    const emails = await Conversation.find()
      .sort({_id:-1})
      .limit(20);

    res.json(emails);

  }catch(err){

    res.status(500).json({error:"Failed to fetch emails"});

  }

});

app.get("/analyze-history/:userID", async(req,res)=>{

  const {userID}=req.params;

  const data = await Conversation.find({
    $or:[
      {user1ID:userID},
      {user2ID:userID}
    ]
  });

  if(data.length===0){

    return res.json({
      totalInteractions:0,
      negativeInteractions:0,
      behavior:"No Data"
    });

  }

  let negativeCount=0;

  data.forEach(d=>{

    if(d.user1ID===userID && d.emotion1==="anger")
      negativeCount++;

    if(d.user2ID===userID && d.emotion2==="anger")
      negativeCount++;

  });

  const ratio = negativeCount/data.length;

  let behavior="Balanced Communicator";

  if(ratio>0.7) behavior="Highly Aggressive";
  else if(ratio>0.4) behavior="Often Negative";
  else if(ratio>0.2) behavior="Occasionally Negative";

  res.json({
    totalInteractions:data.length,
    negativeInteractions:negativeCount,
    behavior
  });

});

cron.schedule("*/10 * * * * *", () => {

  console.log("Checking emails...");
  fetchEmails();

});

app.listen(5000,()=>console.log("Server running on port 5000"));