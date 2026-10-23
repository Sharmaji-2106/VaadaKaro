'use server';

import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function getCloudinarySignature() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const timestamp = Math.round(new Date().getTime() / 1000);
    const secret = process.env.CLOUDINARY_API_SECRET;
    
    if (!secret || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn('Cloudinary credentials missing, skipping signature generation');
      return null;
    }

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: 'vaadakaro_complaints',
      },
      secret
    );

    return {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    };
  } catch (error) {
    console.error('Signature generation failed:', error);
    return null;
  }
}

/**
 * Server-side robust upload as requested by user.
 * Return { success: true, url: null } if fails so complaint doesn't block.
 */
export async function uploadFileToCloudinary(base64Data: string) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return { success: true, url: null, warning: "Upload skipped: Missing configuration" };
    }

    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'vaadakaro_complaints',
    });

    return { success: true, url: result.secure_url };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return { success: true, url: null, error: "Upload failed" };
  }
}

