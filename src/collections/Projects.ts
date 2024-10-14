import { CollectionConfig } from "payload/types";

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
      relationTo: "media", // Refers to the Media collection
      required: true,
    },
    {
      name: "gallery",
      type: "array",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media", // Refers to the Media collection
        },
      ],
      maxRows: 4,
    },
  ],
  hooks: {
    afterDelete: [
      async ({ doc, req }) => {
        // Handle deletion of the associated media documents and S3 files
        const bucketName = process.env.AWS_BUCKET_NAME;

        if (!bucketName) {
          throw new Error("S3 bucket name not found in environment variables.");
        }

        // Delete main image from S3 and MongoDB
        if (doc.mainImg) {
          const mediaDoc = await req.payload.findByID({
            collection: "media",
            id: doc.mainImg,
          });

          if (mediaDoc && mediaDoc.s3Key) {
            // Delete from S3
            await req.payload.delete({
              collection: "media",
              id: doc.mainImg,
            });
          }
        }

        // Delete gallery images from S3 and MongoDB
        if (doc.gallery && Array.isArray(doc.gallery)) {
          for (const galleryImage of doc.gallery) {
            const mediaDoc = await req.payload.findByID({
              collection: "media",
              id: galleryImage.image,
            });

            if (mediaDoc && mediaDoc.s3Key) {
              // Delete from S3
              await req.payload.delete({
                collection: "media",
                id: galleryImage.image,
              });
            }
          }
        }
      },
    ],
  },
};

export default Projects;
