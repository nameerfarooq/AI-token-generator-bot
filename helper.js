import fs from "fs";
import fetch from "node-fetch";
import { createThirdwebClient } from "thirdweb";
import { upload, resolveScheme } from "thirdweb/storage";
import dotenv from "dotenv";
dotenv.config();

const client = createThirdwebClient({
  secretKey: process.env.THIRD_WEB_SECRET_KEY,
});
const replaceClientId = (url, newClientId) => {
  return url.replace(
    /https:\/\/([a-f0-9]+)\.ipfscdn\.io/,
    `https://${newClientId}.ipfscdn.io`
  );
};
const uploadFileToIPFS = async (fileOrUrl, fileNameToBeSaved) => {
  try {
    // if (!fileOrUrl) return null;

    const saveImage = async (url, filename) => {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch image: ${response.statusText}`);

      const buffer = await response.buffer();
      fs.writeFileSync(filename, buffer);
      console.log(`✅ Image saved to ${filename}`);
      return;
    };

    await saveImage(fileOrUrl, `./${fileNameToBeSaved}.png`);

    const imageBuffer = fs.readFileSync(`./${fileNameToBeSaved}.png`);

    const uri = await upload({
      client,
      files: [
        new File([imageBuffer], `${fileNameToBeSaved}.png`, {
          type: "image/png",
        }),
      ],
    });

    let url = resolveScheme({
      client,
      uri: uri,
    });

    if (!url.includes(process.env.THIRD_WEB_CLIENT_ID)) {
      url = replaceClientId(url, process.env.THIRD_WEB_CLIENT_ID);
    }
    if (fs.existsSync(`./${fileNameToBeSaved}.png`)) {
      fs.unlinkSync(`./${fileNameToBeSaved}.png`);
      console.log("✅ File deleted successfully");
    } else {
      console.log("⚠️ File does not exist");
    }
    return url;
  } catch (error) {
    console.error("❌ uploadFileToIPFS() Error:", error.message);
    return null;
  }
};

export default uploadFileToIPFS;
