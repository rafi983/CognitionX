import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const timestamp = Date.now();
    const fileName = `${uuidv4()}-${timestamp}-${file.name.replace(/\s/g, "_")}`;

    // Create uploads directory outside of the code directory
    // This will store files at C:\Users\ACER\Desktop\CognitionX-uploads
    const uploadsDir = path.join(process.cwd(), "..", "CognitionX-uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }

    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // Convert the buffer to base64 for immediate use with Gemini
    // No need to reference the file path since we'll use base64 directly
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    return NextResponse.json({
      success: true,
      // Instead of returning a URL to a file path, we'll just return a unique identifier
      // that can be used for reference in the UI, but won't actually be used to fetch the image
      url: `memory-only-${fileName}`,
      // The base64 data is what will be used both for display and for the API
      base64Data: `data:${mimeType};base64,${base64Image}`,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Error uploading image" },
      { status: 500 },
    );
  }
}
