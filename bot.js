import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchTrendingTokens() {
  console.log("AI is doing its magic-please wait!!!");
  const prompt = `
Give me a list of the top 1 current global trends (can be from X/Twitter, pop culture, news, memes, crypto, or tech).

Then for each trend, create a fun meme token with:
1. Name
2. Symbol (3-6 capital letters)
3. Short and funny or marketable description (1-2 lines)

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
    console.log("NEW : ", tokens);
    const updatedTokensWithImages = await generateAndAttachImagewithTokens(tokens);
    console.log("updatedTokensWithImages : ",updatedTokensWithImages)
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
You are designing a high-quality token image for a new crypto meme token launching on a Web3 launchpad.
Use the following details to create a fun, marketable 1024x1024 image:
- Name: ${token.name}
- Symbol: ${token.symbol}
- Description: ${token.description}
Create a professional-looking design with a polished, modern aesthetic. 
Avoid hand-drawn or cartoon styles. Focus on 3D elements, gradients, lighting effects, and minimalism.
No plain text logos — incorporate visual symbolism representing the token’s name or theme.

`;

    try {
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        quality:"standard",
        size: "1024x1024",
      });

      const imageUrl = imageResponse.data[0]?.url || null;

      updatedTokens.push({
        ...token,
        image: imageUrl,
      });

      console.log(`✅ Generated image for: ${token.name} `,imageUrl);
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
  return updatedTokens
}
fetchTrendingTokens();
