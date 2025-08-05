import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";
import uploadFileToIPFS from "./helper.js";
dotenv.config();
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Content-Type": "application/json",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchTrendingTokens(tokensQuantity = 10) {
  console.log("AI is doing its magic-please wait!!!");
  const prompt = `
Give me a list of the top ${tokensQuantity} current global trends (can be from X/Twitter, crypto, sports, politics, investments, or tech).

Then for each trend, create a fun meme token with:
1. Name
2. Symbol (3-6 capital letters)
3. Short and funny or marketable description (2-3 lines)

Return a **pure JSON array** of objects like:
[
  {
    "name": "Dogeverse",
    "symbol": "DOGV",
    "description": "Merging doge with the metaverse!"
  },
  ...
]

DO NOT include any explanations or markdown formatting. Only return valid JSON..
`;
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  });
  const content = response.choices[0].message.content;
  //   const content = [];
  let tokens = JSON.parse(content);
  try {
    const filePath = "./trendyTokens.json";
    // Step 1: Read existing tokens if file exists
    let existingTokens = [];
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      try {
        existingTokens = JSON.parse(raw);
      } catch (e) {
        console.warn(
          "Existing file is corrupted or not valid JSON. Starting fresh."
        );
        existingTokens = [];
      }
    }
    const updatedTokensWithImages = await generateAndAttachImagewithTokens(
      tokens
    );
    const updatedTokens = [...existingTokens, ...updatedTokensWithImages];

    fs.writeFileSync("trendyTokens.json", JSON.stringify(updatedTokens));
  } catch (e) {
    console.error("Failed to parse JSON:\n", e);
    return;
  }
}
async function generateAndAttachImagewithTokens(tokens) {
  const updatedTokens = [];

  for (const token of tokens) {
    const prompt = `
You are designing a high-quality  image for a new crypto meme project launching on a Web3 launchpad.
Use the following details to create a fun, marketable 1024x1024 image:
- Name: ${token.name}
- Symbol: ${token.symbol}
- Description: ${token.description}
Remember that you are creating a image that will be repeated multiple times by different name, symbol, description. So try to create a completely different image not the common ones likes in a coin shape or so.
`;

    try {
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        quality: "standard",
        size: "1024x1024",
      });

      const imageUrl = imageResponse.data[0]?.url || null;
      const fileUploadedURL = await uploadFileToIPFS(
        imageUrl,
        `${token?.name}-${token?.symbol}`
      );
      console.log("IPFS : ", fileUploadedURL);
      updatedTokens.push({
        ...token,
        image: fileUploadedURL,
      });

      console.log(`✅ Generated image for: ${token.name} `, imageUrl);
    } catch (err) {
      console.error(
        `❌ Failed to generate image for ${token.name}:`,
        err.message
      );
      updatedTokens.push({
        ...token,
        image: null,
      });
    }
  }
  return updatedTokens;
}
const createTokensOnPumpkin = async () => {
  const filePath = "./trendyTokens.json";
  // Step 1: Read existing tokens if file exists
  let existingTokens = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    try {
      existingTokens = JSON.parse(raw);
    } catch (e) {
      console.warn(
        "Existing file is corrupted or not valid JSON. Starting fresh."
      );
      existingTokens = [];
    }
  }
  if (existingTokens.length === 0) {
    console.log("No tokens left to create.");
    return;
  }
  const tokensToBeCreated = existingTokens.splice(0, 1)[0];

  const tokenDetails = {
    creatoraddr: "pmrDYfNsBELgTd2Fy4QH3j2N8TYwzymU6VeupGJdxYP",
    name: tokensToBeCreated?.name,
    symbol: tokensToBeCreated?.symbol,
    description: `<p>${tokensToBeCreated?.description}</p>`,
    logo: tokensToBeCreated?.image,
    socials: {},
    milestones: {},
    createdFromVersion: 3,
    creatorFeeSplit: 4615,
  };
  // console.log("token ready: ", tokenDetails);
  const response = await axios.post(
    process.env.BASE_URL_PUMPKIN,
    tokenDetails,
    {
      headers: HEADERS,
      timeout: 15000,
    }
  );
  console.log("response : ", response?.data);
  if (response?.status) {
    fs.writeFileSync(filePath, JSON.stringify(existingTokens));
  }
};

createTokensOnPumpkin();
setInterval(() => {
  createTokensOnPumpkin();
}, 30 * 60 * 1000); // 30 minutes
setInterval(() => {
  fetchTrendingTokens(24);
}, 12 * 60 * 1000); // 12 hour
