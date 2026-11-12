import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ExifReader from "exifreader";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_FOLDER = path.join(__dirname, "../public/img");
const METADATA_FOLDER = path.join(__dirname, "../content/gallery");

function formatDateString(dateStr) {
    if (!dateStr || dateStr.trim() === "") {
        return "";
    }

    const formatted = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");

    // 可選: 驗證日期是否有效
    const date = new Date(formatted);
    if (isNaN(date.getTime())) {
        console.warn("Invalid date format:", dateStr);
        return "";
    }

    return formatted;
}

/**
 * 將字串轉換為安全的 HTML id（slugify）
 */
function slugify(text) {
    return text
        .toLowerCase() // 轉小寫
        .normalize("NFD") // 將 unicode 字元標準化
        .replace(/[\u0300-\u036f]/g, "") // 移除變音符號
        .replace(/[^\w\s-]/g, "") // 移除特殊字元（保留字母、數字、空格、連字號）
        .trim() // 去除首尾空格
        .replace(/[\s_]+/g, "-") // 將空格和底線轉為連字號
        .replace(/^-+|-+$/g, ""); // 移除首尾的連字號
}

/**
 * 生成唯一且安全的 HTML id
 */
function generateSafeId(filename) {
    const baseName = path.parse(filename).name;
    const slug = slugify(baseName);

    // 生成 8 字元的短 hash 確保唯一性
    const uniqueHash = nanoid(8);

    // 如果 slug 為空或以數字開頭，加上前綴
    const needsPrefix = !slug || /^\d/.test(slug);
    const prefix = needsPrefix ? "img-" : "";

    // 組合：前綴 + slug + hash
    return `${prefix}${slug}-${uniqueHash}`;
}

/**
 * 從 EXIF 數據中提取有用的資訊
 */
function extractExifData(tags) {
    const exif = {
        DateTime: "", // 編輯時間 {"2025:06:05 23:29:44"}
        DateTimeOriginal: "", // 拍攝時間 {"2025:03:17 14:22:52"}
        DateTimeDigitized: "", // 拍攝時間 {"2025:03:17 14:22:52"}
        ExposureTime: "", // 快門速度 {'1/640'}
        FNumber: "", // 快門速度 {'f/10.0'}
        ExposureMode: "", // {"Auto exposure"}
        ExposureProgram: "", // {"Aperture priority"}
        ISOSpeedRatings: "", // {125}
        Copyright: "",
        Artist: "",
        Make: "", // {'SONY'}
        LensSpecification: "", // {'55-55 mm f/1.8'}
        Model: "", // {"ILCE-7C"}
        Orientation: "", // {"top-left"}
        PixelXDimension: "", // {4598}
        PixelYDimension: "", // {3059}
        FocalLength: "", // {"55 mm"}
    };

    try {
        Object.keys(exif).forEach(key => {
            // 調整至正確格式
            if (["DateTime", "DateTimeOriginal", "DateTimeDigitized"].includes(key)) {
                exif[key] = formatDateString(tags?.exif?.[key]?.description ?? "");
                return;
            }
            exif[key] = tags?.exif?.[key]?.description ?? "";
        });
    } catch (error) {
        console.warn("Error extracting EXIF ", error.message);
    }

    return {
        ...exif,
    };
}

/**
 * 判斷值是否為「空」（沒有值）
 */
function isEmpty(value) {
    if (value === undefined || value === null) return true;
    if (value === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
}

/**
 * 合併物件，只更新目標物件中「沒有值」的欄位
 * @param {Object} existing - 現有的資料（優先保留）
 * @param {Object} newData - 新的資料
 * @returns {Object} 合併後的物件
 */
function mergeMetadata(existing, newData) {
    const merged = { ...existing };

    for (const key in newData) {
        // 如果現有資料沒有這個欄位，或該欄位的值為空，則使用新資料
        if (!(key in merged) || isEmpty(merged[key])) {
            merged[key] = newData[key];
        }
    }

    return merged;
}

async function syncGalleryMetadata() {
    // 確保 metadata 資料夾存在
    await fs.mkdir(METADATA_FOLDER, { recursive: true });

    // 讀取所有圖片
    const imageFiles = await fs.readdir(IMAGE_FOLDER);
    const validImages = imageFiles.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));

    // 為每個新圖片建立 metadata 檔案（如果不存在）
    for (const imageFile of validImages) {
        const baseName = path.parse(imageFile).name;
        const metadataPath = path.join(METADATA_FOLDER, `${baseName}.json`);
        const imagePath = path.join(IMAGE_FOLDER, imageFile);

        // 讀取 EXIF 資料
        const fileBuffer = await fs.readFile(imagePath);
        const tags = ExifReader.load(fileBuffer, { expanded: true });
        const exif = extractExifData(tags);

        // 建立新的 metadata 模板
        const newMetadata = {
            fileId: `${generateSafeId(baseName)}`,
            name: baseName,
            image: `/img/${imageFile}`,
            description: "",
            date: "",
            tags: [],
            location: "",
            customLocation: "",
            coordinates: "",
            published: true,
            weight: 0,
            ...exif,
        };

        try {
            // 嘗試讀取現有檔案
            const existingData = await fs.readFile(metadataPath, "utf-8");
            const existingMetadata = JSON.parse(existingData);

            // 合併資料：保留現有的有值欄位，只更新空欄位
            const mergedMetadata = mergeMetadata(existingMetadata, newMetadata);

            // 寫回檔案
            await fs.writeFile(metadataPath, JSON.stringify(mergedMetadata, null, 2));
            console.log(`✓ Updated: ${baseName}.json`);
        } catch (error) {
            if (error.code === "ENOENT") {
                // 檔案不存在的情況
                try {
                    await fs.writeFile(metadataPath, JSON.stringify(newMetadata, null, 2));
                    console.log(`✓ Created: ${baseName}.json`);
                } catch (writeError) {
                    console.error(`❌ 無法建立檔案 ${baseName}.json：`, writeError.message);
                }
            } else if (error instanceof SyntaxError) {
                // JSON 解析錯誤
                console.error(`❌ ${baseName}.json 格式無效：`, error.message);
            } else {
                // 其他錯誤
                console.error(`❌ 處理 ${baseName}.json 時發生錯誤：`, error.message);
            }
        }
    }

    console.log(`\n✅ Sync completed: ${validImages.length} images processed`);
}

syncGalleryMetadata().catch(console.error);

