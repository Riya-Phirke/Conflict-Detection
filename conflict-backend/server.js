const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Sentiment = require("sentiment");

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

function detectEmotion(score){
  if(score > 2) return "Highly Positive";
  if(score > 0) return "Positive";
  if(score === 0) return "Neutral";
  if(score > -3) return "Negative";
  return "Highly Negative";
}

function detectTriggers(message){
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

function rephraseSentence(message,triggers){

  const replacements={
    hate:"strongly disagree with",
    angry:"concerned about",
    terrible:"not satisfactory",
    annoying:"frustrating",
    worst:"challenging",
    stupid:"not ideal",
    irresponsible:"needs improvement",
    useless:"not effective",
    unfair:"not balanced",
    fired:"removed from this role"
  };

  let words = message.split(" ");

  words = words.map(word=>{
    const clean = word.toLowerCase().replace(/[.,!?]/g,"");

    if(triggers.includes(clean) && replacements[clean]){
      return replacements[clean];
    }

    return word;
  });

  return words.join(" ");
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

  const {conflictType,user1ID,user2ID,user1Message,user2Message}=req.body;

  const s1 = sentiment.analyze(user1Message);
  const s2 = sentiment.analyze(user2Message);

  const emotion1 = detectEmotion(s1.score);
  const emotion2 = detectEmotion(s2.score);

  const triggers1 = detectTriggers(user1Message);
  const triggers2 = detectTriggers(user2Message);

  const probability = calculateConflict(s1,s2,triggers1,triggers2);
  const intensityLevel = intensity(probability);

  let rephrasedUsers=[];

  if(s1.score < 0){
    rephrasedUsers.push({
      userID:user1ID,
      suggestion:rephraseSentence(user1Message,triggers1)
    });
  }

  if(s2.score < 0){
    rephrasedUsers.push({
      userID:user2ID,
      suggestion:rephraseSentence(user2Message,triggers2)
    });
  }

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
    triggers2,
    rephrasedUsers
  });

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
    if(d.user1ID===userID && (d.emotion1==="Negative"||d.emotion1==="Highly Negative")) negativeCount++;
    if(d.user2ID===userID && (d.emotion2==="Negative"||d.emotion2==="Highly Negative")) negativeCount++;
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

app.listen(5000,()=>console.log("Server running on port 5000"));