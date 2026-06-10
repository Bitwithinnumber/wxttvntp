import { NextResponse, type NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/** Upload product images to /public/uploads, return accessible URLs */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: "请上传至少一张商品图" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      const ext = path.extname(file.name) || ".png";
      const name = `${randomUUID()}${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(dir, name), buf);
      urls.push(`/uploads/${name}`);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
