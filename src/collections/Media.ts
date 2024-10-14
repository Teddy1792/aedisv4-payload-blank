import { CollectionConfig } from "payload/types";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Configure S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const Media: CollectionConfig = {
  slug: "media",
  upload: {
    mimeTypes: ["image/jpeg", "image/png"], // Allowed MIME types
  },
  fields: [
    {
      name: "altText",
      type: "text",
      required: true,
    },
    {
      name: "s3Url",
      type: "text",
      admin: {
        readOnly: true, // Automatically set by S3
      },
    },
    {
      name: "s3Key",
      type: "text",
      admin: {
        readOnly: true, // Automatically set by S3
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        console.log("Document ID:", doc.id);
        console.log("Document:", doc);

        // Check if there is a file in the request
        if (req.files && req.files.file) {
          const file = req.files.file;
          const s3Key = `media/${doc.id}-${file.name}`; // Ensure unique filenames
          console.log(`Uploading file to S3: ${s3Key}`);

          // Upload to S3 using the 'data' buffer
          const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: file.data,
            ContentType: file.mimetype,
          };

          try {
            await s3.send(new PutObjectCommand(uploadParams));

            const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

            // Now, update the document with the S3 URL and S3 key directly
            await req.payload.update({
              collection: "media",
              id: doc.id,
              data: {
                s3Url,
                s3Key,
              },
            });

            console.log(
              `Document updated with S3 URL and Key: ${s3Url}, ${s3Key}`
            );
          } catch (error) {
            console.error("Error uploading to S3 or updating document:", error);
          }
        }
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        if (doc.s3Key) {
          try {
            await s3.send(
              new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: doc.s3Key,
              })
            );
            console.log(`File deleted from S3: ${doc.s3Key}`);
          } catch (error) {
            console.error("Error deleting file from S3:", error);
          }
        }
      },
    ],
  },
};

export default Media;
