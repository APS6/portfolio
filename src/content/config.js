
import { z, defineCollection } from 'astro:content';


const portfolioCollection = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
        description: z.string(),
        url: z.string(),
        slug: z.string()
    }),
});

export const collections = {
    'projects': portfolioCollection,
};