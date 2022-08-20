import { Router, Request, Response } from 'express';
import { FeedItem } from '../models/FeedItem';
import { requireAuth } from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';

const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
    const items = await FeedItem.findAndCountAll({ order: [['id', 'DESC']] });

    items.rows.map((item) => {
        if (item.url) {
            item.url = AWS.getGetSignedUrl(item.url);
        }
    });
    res.send(items);
});

//@TODO
//Add an endpoint to GET a specific resource by Primary Key
router.get(
    '/:id', // Endpoint
    /* async - make a function return a promise */
    async (
        req: Request,
        res: Response
    ) => { /* Lambda function */

        /* Unpack request parameters */
        let { id } = req.params;

        /* Validate parameters */
        if (!id)
            return res
                .status(400)
                .send(`id is required`);

        /* Try and get feed */
        const feed = await FeedItem.findById(id);
		if(!feed) {
			return res.status(400)
				.send(`feed with id ${id} is not found`);
		}

        /* Server Response */
        return res
            .status(200) // Response status
            .send(feed); // Response body
    }
);

// update a specific resource
router.patch('/:id',
    requireAuth,
    async (req: Request, res: Response) => {
        //@TODO try it yourself

        /* Unpack request parameters */
        let { id } = req.params;

        /* Or get each parameter */
        const caption = req.body.caption;
        const fileName = req.body.url;

        /* Validate parameters */
        if (!id)
            return res
                .status(400)
                .send(`id is required`);

        if (!caption) {
            return res.status(400).send({ message: 'Caption is required or malformed' });
        }

        if (!fileName) {
            return res.status(400).send({ message: 'File url is required' });
        }

        /* Try and get feed */
        let feed = await FeedItem.findById(id);
		if(!feed) {
			return res.status(400)
				.send(`feed with id ${id} is not found`);
		}

        /* update field */
        feed.caption = caption;
        feed.url = fileName;

        feed = await feed.update({ 
            caption: caption,
            url: fileName
        });

        /* Server Response */
        return res
            .status(200) // Response status
            .send(feed); // Response body
    });


// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName',
    requireAuth,
    async (req: Request, res: Response) => {
        let { fileName } = req.params;
        const url = AWS.getPutSignedUrl(fileName);
        res.status(201).send({ url: url });
    });

// Post meta data and the filename after a file is uploaded 
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/',
    requireAuth,
    async (req: Request, res: Response) => {
        const caption = req.body.caption;
        const fileName = req.body.url;

        // check Caption is valid
        if (!caption) {
            return res.status(400).send({ message: 'Caption is required or malformed' });
        }

        // check Filename is valid
        if (!fileName) {
            return res.status(400).send({ message: 'File url is required' });
        }

        const item = await new FeedItem({
            caption: caption,
            url: fileName
        });

        const saved_item = await item.save();

        saved_item.url = AWS.getGetSignedUrl(saved_item.url);
        res.status(201).send(saved_item);
    });

export const FeedRouter: Router = router;