const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const config = {
  imap: {
    user: "ashwinipalande07@gmail.com",
    password: "hcvf dmfn ukgk fsny",
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    authTimeout: 3000,
    tlsOptions: { rejectUnauthorized: false }
  }
};

async function fetchEmails(){

  try{

    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = { bodies:[""], markSeen:true };

    const messages = await connection.search(searchCriteria,fetchOptions);

    for(const item of messages){

      const part = item.parts.find(p => p.which === "");
      const mail = await simpleParser(part.body);

      const emailText = mail.text;
      const sender = mail.from.text;

      console.log("New Email:", emailText);

      await fetch("http://localhost:5000/analyze",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          user1ID: sender,
          user2ID: "email_receiver",
          user1Message: emailText,
          user2Message: ""
        })
      });

    }

    connection.end();

  }catch(err){

    console.log("Email fetch error:",err);

  }

}

module.exports = fetchEmails;