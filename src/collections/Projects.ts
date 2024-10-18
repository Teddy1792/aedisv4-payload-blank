import { CollectionConfig } from "payload/types";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"; // Import the S3 client and delete command

// Initialize the S3 client
const s3 = new S3Client({
  region: process.env.PAYLOAD_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const Projects: CollectionConfig = {
  slug: "projets",
  fields: [
    {
      name: "titre",
      type: "text",
      required: true,
    },
    {
      name: "localisation",
      type: "text",
      required: true,
    },
    {
      name: "date",
      type: "date",
      required: true,
    },
    {
      name: "description",
      type: "textarea",
    },
    {
      name: "tags",
      type: "array",
      fields: [
        {
          name: "tag",
          type: "text",
        },
      ],
    },
    {
      name: "mainImg",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "gallery",
      type: "array",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
        },
      ],
      maxRows: 4,
    },
  ],
  hooks: {
    afterDelete: [
      async ({ doc, req }) => {
        const bucketName = process.env.PAYLOAD_PUBLIC_AWS_BUCKET_NAME; // Corrected typo

        if (!bucketName) {
          throw new Error("S3 bucket name not found in environment variables.");
        }

        // Function to delete files from S3
        const deleteFromS3 = async (s3Key: string) => {
          try {
            const deleteParams = {
              Bucket: bucketName,
              Key: s3Key,
            };
            await s3.send(new DeleteObjectCommand(deleteParams));
            console.log(`Successfully deleted file from S3: ${s3Key}`);
          } catch (error) {
            console.error(`Error deleting file from S3: ${s3Key}`, error);
          }
        };

        // Delete main image from S3 and MongoDB
        if (doc.mainImg) {
          console.log("Deleting main image from S3 and MongoDB", doc.mainImg);
          const mediaDoc = await req.payload.findByID({
            collection: "media",
            id: doc.mainImg.id as string,
          });

          if (mediaDoc && mediaDoc.s3Key) {
            console.log("Deleting main image from S3", mediaDoc.s3Key);
            // First delete from S3
            await deleteFromS3(mediaDoc.s3Key as string);

            // Then delete the media document from MongoDB
            await req.payload.delete({
              collection: "media",
              id: mediaDoc.id as string,
            });
          }
        }

        // Delete gallery images from S3 and MongoDB
        if (doc.gallery && Array.isArray(doc.gallery)) {
          for (const galleryImage of doc.gallery) {
            console.log(
              "Deleting gallery image from S3 and MongoDB",
              galleryImage
            );
            const mediaDoc = await req.payload.findByID({
              collection: "media",
              id: galleryImage.image.id as string,
            });

            if (mediaDoc && mediaDoc.s3Key) {
              console.log("Deleting gallery image from S3", mediaDoc.s3Key);
              // First delete from S3
              await deleteFromS3(mediaDoc.s3Key as string);

              // Then delete the media document from MongoDB
              await req.payload.delete({
                collection: "media",
                id: mediaDoc.id as string,
              });
            }
          }
        }
      },
    ],
  },
};

export default Projects;
