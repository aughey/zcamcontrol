import { mjpegStreamRx } from './mjpeg_stream';
import { writeFileSync } from 'fs'
import sharp from 'sharp'

mjpegStreamRx(process.argv[2]).subscribe(async buf => {
    console.log("Buff")
    var imagedata = await sharp(buf).png().toBuffer();
    writeFileSync("image.png", imagedata);
})
