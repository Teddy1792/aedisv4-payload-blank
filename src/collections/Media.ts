import { S3Client } from "@aws-sdk/client-s3";
import { S3UploadCollectionConfig } from "payload-s3-upload";

// Configure S3 client
const s3 = new S3Client({
  region: process.env.PAYLOAD_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const Media: S3UploadCollectionConfig = {
  slug: "media",
  upload: {
    disableLocalStorage: true,
    s3: {
      bucket: process.env.PAYLOAD_PUBLIC_AWS_BUCKET_NAME,
      prefix: "images/",
    },
  },
  fields: [
    {
      name: "url",
      type: "text",
      admin: {
        disabled: true,
      },
    },
    {
      name: "s3Key",
      type: "text",
      admin: {
        disabled: true,
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        if (doc.filename) {
          const s3Key = `images/${doc.filename}`;
          const s3Url = `https://${process.env.PAYLOAD_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.PAYLOAD_PUBLIC_AWS_REGION}.amazonaws.com/images/${doc.filename}`;
          console.log("Generated S3 URL:", s3Url);
          if (doc.s3Key !== s3Key || doc.url !== s3Url) {
            // Add a delay before updating to allow MongoDB to persist the document
            setTimeout(async () => {
              try {
                await req.payload.update({
                  collection: "media",
                  id: doc.id,
                  data: {
                    s3Key: s3Key,
                    url: s3Url,
                  },
                });
                console.log(`Document updated with S3 URL: ${s3Url}`);
              } catch (error) {
                console.error("Error updating document:", error);
              }
            }, 1000); // 1 second delay
          }
        } else {
          console.error("Filename is missing, cannot generate S3 URL.");
        }
      },
    ],
    afterRead: [
      ({ doc }) => {
        if (doc.filename) {
          doc.url = `https://${process.env.PAYLOAD_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.PAYLOAD_PUBLIC_AWS_REGION}.amazonaws.com/images/${doc.filename}`;
        }
      },
    ],
  },
};

export default Media;
