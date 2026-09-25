require("dotenv").config();
const express=require("express"),cors=require("cors"),app=express();
app.use(cors());
app.use(express.json());

const PORT=process.env.PORT||10000;
const OPENROUTER_API_KEY=process.env.OPENROUTER_API_KEY;
const MODEL=process.env.OPENROUTER_MODEL||"openrouter/free";

const SYSTEM_PROMPTS={
  chat:"You are NEXUS, the AI core of a personal command-center app called Shadow Nexus. Be concise, direct and helpful.",
  code:"You are NEXUS, a coding assistant inside the Shadow Nexus AI Core. Give correct, well-formatted code with brief explanations.",
  research:"You are NEXUS, a research assistant inside the Shadow Nexus AI Core. Give clear, well-organized, factual answers."
};

app.get("/health",(req,res)=>res.json({status:"ok",service:"ai",configured:Boolean(OPENROUTER_API_KEY)}));
app.get("/",(req,res)=>res.json({service:"shadow-nexus-ai",status:"running"}));

app.post("/chat",async(req,res)=>{
  try{
    if(!OPENROUTER_API_KEY){
      return res.status(500).json({error:"OPENROUTER_API_KEY is not set on the server."});
    }
    const{message,history=[],mode="chat"}=req.body||{};
    if(!message||typeof message!=="string"){
      return res.status(400).json({error:"message is required"});
    }

    const messages=[
      {role:"system",content:SYSTEM_PROMPTS[mode]||SYSTEM_PROMPTS.chat},
      ...history.slice(-20).map(m=>({role:m.role==="assistant"?"assistant":"user",content:String(m.content||"")})),
      {role:"user",content:message}
    ];

    const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer":"https://shadow-nexus.app",
        "X-Title":"Shadow Nexus"
      },
      body:JSON.stringify({model:MODEL,messages})
    });

    const data=await r.json();
    if(!r.ok){
      return res.status(r.status).json({error:data.error?.message||"OpenRouter request failed."});
    }

    const reply=data.choices?.[0]?.message?.content||"No response.";
    res.json({response:reply,model:data.model||MODEL});
  }catch(err){
    console.error("Chat error:",err);
    res.status(500).json({error:"Server error contacting the AI provider."});
  }
});

app.listen(PORT,()=>console.log("Shadow Nexus ai backend listening on "+PORT));
