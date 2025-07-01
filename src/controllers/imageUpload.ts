import multer from "multer";
import path from "path";
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import config from "../config";

export type TImageUpload = {
  asset_id: string;
  public_id: string;
  version: number;
  version_id: string;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
  api_key: string;
};

const filePath = path.join(process.cwd(), 'uploads')

cloudinary.config({
  cloud_name: config.CLOUDINARY.CLOUD_NAME,
  api_key: config.CLOUDINARY.API_KEY,
  api_secret: config.CLOUDINARY.API_SECRET
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // fs.createWriteStream(filePath);
    cb(null, filePath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname);
  }
})

/**
 * Multer middleware configuration for file upload.
 *
 * @type {multer.Multer}
 */
const upload: multer.Multer = multer({ storage: storage });

/**
 * Uploads a file to Cloudinary.
 *
 * @param {string} path - The path of the file to upload.
 * @returns {Promise<TImageUpload>} - Promise that resolves with the Cloudinary upload response.
 */
const uploadToCloudinary = async (path: string): Promise<TImageUpload> => new Promise((resolve, reject) => {
  cloudinary.uploader.upload(
    path,
    ((error, result: any) => {
      fs.unlinkSync(path);
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    })
  );
});

/**
 * Object containing multer and Cloudinary upload methods.
 */
export const uploadImage = {
  upload,
  uploadToCloudinary
};
