const cloudinary = require('cloudinary').v2;

const oldConfig = {
    cloud_name: 'dpi8d9his',
    api_key: '355986778752844',
    api_secret: 'tGUHQXyKbvoI9LdPKtlJgNJSGf8'
};

const newConfig = {
    cloud_name: 'dfhmut9lf',
    api_key: '892774349659755',
    api_secret: 'wollksuLbhMwcEGp-CsQe2lh7gc'
};

async function migrate() {
    console.log('Starting migration...');

    // 1. Fetch all assets from source
    // We need to fetch 'image', 'video', and 'raw' ideally, but 'image' is primary.
    // Let's try to do 'image' first.
    
    cloudinary.config(oldConfig);
    
    // Helper to get resources of a type
    async function getResources(type) {
        let items = [];
        let nextCursor = null;
        try {
            do {
                console.log(`Fetching ${type} assets... ${nextCursor ? '(next page)' : ''}`);
                // Note: resource_type 'raw' might not support same options or might be empty, try/catch wrap
                const result = await cloudinary.api.resources({
                    max_results: 500,
                    next_cursor: nextCursor,
                    resource_type: type
                });
                items = items.concat(result.resources);
                nextCursor = result.next_cursor;
            } while (nextCursor);
        } catch (e) {
            console.error(`Error fetching ${type}: ${e.message}`);
        }
        return items;
    }

    const images = await getResources('image');
    const videos = await getResources('video');
    const raws = await getResources('raw'); // Use careful checks

    const allAssets = [...images, ...videos, ...raws];
    console.log(`Total assets found: ${allAssets.length}`);

    if (allAssets.length === 0) {
        console.log("No assets found. Exiting.");
        return;
    }

    // 2. Upload to destination
    cloudinary.config(newConfig);

    for (let i = 0; i < allAssets.length; i++) {
        const asset = allAssets[i];
        const assetUrl = asset.secure_url;
        const publicId = asset.public_id;
        console.log(`[${i + 1}/${allAssets.length}] Migrating: ${publicId} (${asset.resource_type})`);

        try {
            await cloudinary.uploader.upload(assetUrl, {
                public_id: publicId,
                overwrite: true,
                resource_type: asset.resource_type,
                // Preserve format if needed, though upload by URL usually handles it
            });
        } catch (error) {
            console.error(`Failed to migrate ${publicId}:`, error.message);
        }
    }

    console.log('Migration complete.');
}

migrate().catch(e => console.error(e));
