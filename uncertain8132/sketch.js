
    let t = 0.0;
    let pg, pgMask;
    let pgMaskArray;
    let recording = true;
    let pgW, pgH;

    //PALETTE
    let palette = [
        ['#FF0000', '#00FF00', '#0000FF'], 
    ];

    let centerPalette = ['##0000FF', '#FF0000', '#CCC', '#00ff00', '#666', '#fff'];
    let glitchPalette  = ['##0000FF', '#FF0000', '#00ff00', '#00ffff', '#ffff00', '#ff00ff', '#ffffff'];
    let subPalette = [

        ['#ffffff', 0.1, '#00ff00', 0.5, '#0000ff', 0.4],
        ['#00ff00', 0.1, '#ffffff', 0.1, '#0000ff', 0.8],

        ['#ff0000', 0.0, '#0000ff', 0.65, '#00FF00', 0.3, '#ffffff', 0.05],
        ['#ff0000', 0.3, '#0000ff', 0.5, '#ffff00', 0.1, '#ff00ff', 0.1],
        ['#ff0000', 0.3, '#00ffff', 0.3, '#ffff00', 0.3, '#ffffff', 0.1],
        ['#ff0000', 0.3, '#00ffff', 0.2, '#0000ff', 0.3, '#ffffff', 0.2],
        ['#ff0000', 0.1, '#00ffff', 0.0, '#0000ff', 0.0, '#ffffff', 0.9],
        ['#ffffff', 0.1, '#ff0000', 0.3, '#00ff00', 0.3, '#0000ff', 0.3],
        ['#ffffff', 0.0, '#ffff00', 0.2, '#ff0000', 0.4, '#0000ff', 0.4],
        ['#ffffff', 0.0, '#ffff00', 0.2, '#ff0000', 0.5, '#ff00ff', 0.3],
        ['#ffffff', 0.0, '#00ffff', 0.2, '#ff0000', 0.4, '#ff00ff', 0.4],
        ['#ffffff', 0.0, '#00ffff', 0.4, '#ffff00', 0.6, '#000000', 0.0],
        ['#666666', 0.0, '#ff0000', 0.5, '#ff00ff', 0.5, '#ffffff', 0.0],
        ['#00ff00', 0.4, '#ff0000', 0.2, '#ffffff', 0.2, '#ff00ff', 0.2],
        ['#cccccc', 0.0, '#ff0000', 0.2, '#ffffff', 0.2, '#0000ff', 0.6],
        

        ['#ffffff', 0.0, '#00ff00', 0.2, '#00ffff', 0.6, '#ffff00', 0.0, '#ff00ff', 0.2],
        ['#ffffff', 0.0, '#ffff00', 0.1, '#ff0000', 0.0, '#0000ff', 0.8, '#ff00ff', 0.1],
        ['#00ff00', 0.3 , '#ff0000', 0.2, '#ff00ff', 0.2, '#0000ff', 0.1, '#ffffff', 0.2],

        ['#666666', 0.0, '#ff0000', 0.1, '#ff00ff', 0.5, '#ffffff', 0.2, '#00ff00', 0.1, '#00ffff', 0.1],

        ['#ffffff', 0.2, '#00ff00', 0.2, '#00ffff', 0.2, '#ffff00', 0.2, '#ff0000', 0.2, '#000000', 0.0],
        ['#666666', 0.0, '#0000ff', 0.2, '#00ffff', 0.1, '#ffff00', 0.2, '#ff0000', 0.2, '#ffffff', 0.3],
        ['#ffffff', 0.1, '#0000ff', 0.2, '#00ff00', 0.2, '#ff0000', 0.2, '#ff00ff', 0.2, '#cccccc', 0.1],
        
        

    ];
    let finalPalette = [];

    let centerColor;


    let palettePicker;
    let numSystems;

    /////RESOLUTION
    let r1 = 12;
    let canvas;

    /////SEEDS
    let seeds;

    //////MARGINS
    let marginX;
    let marginY;

    let seedCount = 0;
    let seedIndex = 0;


    ////PAUSE PLAY
    let running = false;

    ////MODULO
    let mod, modMult;
    let modArray = [[2,2],[2,3],[2,4],[4,2]];
    let margArray = [0];

    ////PARTICLE NOISE MASK THRESHOLD
    let noiseThresh2;

    ////GLITCHNESS
    let hasGlitch;

    /////VERTICAL
    let isVertical = true;
    let verticalLimit;
    let horizontalLimit;


    ///GIF
    let saveGif = false;

    let gif;
    let framesToSkip = 3;
    let makeGif = false;
    let isGifExported = false;

    //////////GRID
    let gridColumns;
    let gridRows;
    let numCells = gridColumns*gridRows;


    //////////////CELLS
    let cells;

    /////MASK
    let maskW;
    let masks;
    let masksNumber;


    // Initial glitch probability and its range
    let glitchProbability = 0.05;
    let glitchProbabilityRange = 0.02;
    let flickerSpeed = 0.005; // Speed of flickering animation
    let rrr = 1;

    ////define seed
    let seed;

        ///BOXES
        let boxMargin;
        let boxDivisionsY;
        let boxDivisionsX;
        let sizeX;
        let sizeY;
        let stepX;
        let stepY;

        /////resolutionchanger
        let res = 0;

        /////HAS PALETTE?
        let hasPalette = true;


    function setup() {
        // Get the actual available space in the window
        windowWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
        windowHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
        pixelDensity(1);

        // Create canvas with the correct size
        canvas = createCanvas(windowWidth, windowHeight);
        frameRate(30);

        t = 0.0;
        frameCount = 0;

        strokeWeight(1.01);

        ////ADJUST DENSITY BASED ON RESOLUTION
        if(innerWidth<900 && innerWidth>700){res=3} else if(innerWidth<=700){res=8} else{res=0};


        seed = floor($o.rnd()*99999999);
        console.log("uncertain index \nby p1xelfool\n\nseed: " + seed + 
            "\n\ncommand menu:\n[P] pause\n[S] save frame\n[G] save gif in full resolution\n[L] save gif in low resolution for social sharing\n\n[-] lower pixel density\n[+] increase pixel density"
        );

        /////has palette
        if(random(1)<0.95){
            hasPalette = true;
        }else{
            hasPalette = false;
        }

        $o.registerExport(
            { mime: 'image/png', resolution: { x: 1130, y: 700 }, default: true }, // change back potentially
            pngExport
        );
        $o.registerExport(
            { mime: 'image/gif', resolution: { x: 400, y: 400 }, thumb: true },
            gifExport
        );

        canvas.toDataURL = function(type, callback) {
            canvasToDataURL(this, callback, type);
        };
        

        if ($o.isCapture) {
            setupGif();
            $o.capture();
        } else {
            begin(seed);
            setupGif();
            running=true
        }
    }

    function draw() {
        if (running) {
            t++;
            drawFrame(windowWidth, windowHeight);

            // GIF: Add frame
            if (makeGif &&
                !isGifExported &&
                ((t - 1) % framesToSkip == 0 || t == 1)
            ) {
                console.log(`Added frame.`)
                gif.addFrame(canvas.elt, {
                    delay: 30,
                    copy: true
                });
            }
        
            // GIF: Render when done
            if (makeGif &&
                !isGifExported &&
                t > 1200
            ) {
                print('Exporting GIF...');
                gif.render();
                isGifExported = true;
            }
        }
    }

    function drawFrame(width, height) {
        background(0);

        // MASK
        pgMask.loadPixels();

        // CELLS
        for (let i = cells.length - 1; i >= 0; i--) {
            let p = cells[i];
            p.run();
            p.display();
        }

        pgMask.updatePixels();

        pgMask.rectMode(CENTER);
        pgMask.noStroke();
        pgMask.fill(255);

        for (let i = masks.length - 1; i >= 0; i--) {
            let m = masks[i];
            m.display();
        }

        // glitch
        glitchProbability += random(-flickerSpeed, flickerSpeed);
        glitchProbability = constrain(glitchProbability, 0, 0.005);
        glitchImage(pgMask, glitchProbability);
    }

    function windowResized() {
        resizeCanvas(windowWidth, windowHeight);
        begin(seed);
    }




    function begin(finalSeed) {

        t = 0.0;
        frameCount = 0;

        randomSeed(seed);
        noiseSeed(4);
        masks = [];


        ////PALETTE
        palettePicker = floor(random(0, palette.length));

        let centerPalettePicker = floor(random(0, centerPalette.length));
        centerColor = centerPalette[centerPalettePicker];

        ////SUB PALETTE
        let subPalettePicker = floor(random(0, subPalette.length));
        centerColor = subPalette[subPalettePicker][0];

        for(let i=0; i<glitchPalette.length; i++){

            ////MAKE ALL THE COLORS OBRIGATORY AND THEN PICK THE NEXT ONES RANDOMLY
            if(i<=(subPalette[subPalettePicker].length/2)-2){
                finalPalette[i] = subPalette[subPalettePicker][i*2+2];
            }else{
                finalPalette[i] = weightedColor(subPalette[subPalettePicker]);
            }
            
        }

            ///////MARGINS
            let marginFinal = margArray[floor(random(0, margArray.length))];
            marginX = marginFinal;
            marginY = marginFinal;


    //NOISE THRESH
        noiseThresh2 = 1;
        hasGlitch = true;


            ///RES
            if(windowWidth > windowHeight){
                r1=8+res;
            }else{
                r1=8+res;
            }

        

        //DEFINE PROPORTIONS
        let ww, hh;
        let pgX, pgY; 
        if(innerWidth>innerHeight){
            ww = 2560;
            hh = 2560 / (innerWidth / innerHeight);
            pgX = int(ww / r1 + 1);
            pgY = int(hh / 2 / r1 + 1);
        }else{
            
            ww = 2560  / (innerHeight / innerWidth);
            hh = 2560;
            pgX = int(ww / r1 + 1);
            pgY = int(hh / 2 / r1 + 1);
        }
        
        pg = createGraphics(pgX, pgY);
        pg.pixelDensity(1);
        pg.colorMode(HSB);


        ///PGMASK
        pgMask = createGraphics(pgX, pgY);
        pgMask.pixelDensity(1);
        pgMask.noSmooth();

        canvas.imageSmoothingEnabled = false;
        p5.disableFriendlyErrors = true;
        noSmooth();



    /////////CELLS
    let cellsOrientation = random(1);
    if(cellsOrientation<0.5){
        gridColumns = 1;//floor(random(1, 10));
        gridRows = 1;//floor(random(1, 3));
    }else{
        gridColumns = 1;//floor(random(1, 3));
        gridRows = 1;//floor(random(1, 10));
    }

    cells = [];

    for(let x=0; x<gridColumns; x++){
        for(let y=0; y<gridRows; y++){
            let finalX = int(x*innerWidth/gridColumns);
            let finalY = int(y*innerHeight/gridRows);
            cells.push(new cell(finalX, finalY));
            cells.push(new cell(finalX, finalY));
        }
    }

    if(innerWidth>innerHeight){
        boxMargin = floor(random(0, 3))*10;
        boxDivisionsY = floor(random(3, 4));
        boxDivisionsX = floor(random(5,8));
        stepX = (pgX - boxMargin*2)/boxDivisionsX;
        stepY = (pgY - boxMargin*2)/boxDivisionsY;

    }else{
        boxMargin = floor(random(1, 3))*10;
        boxDivisionsY = floor(random(3,8));
        boxDivisionsX = floor(random(5,4));
        stepX = (pgX - boxMargin*2)/boxDivisionsX;
        stepY = (pgY - boxMargin*2)/boxDivisionsY;
    }

    let minimumSizeX = random(2, stepX / 2);
    let maximumSizeX = random(2, stepX + 30);

    let minimumSizeY = random(20, stepY / 2);
    let maximumSizeY = random(stepY / 2, stepY + 30);



    for(let x=boxMargin; x<pgMask.width-boxMargin+1; x+=stepX){
        for(let y=boxMargin; y<pgMask.height-boxMargin+1; y+=stepY){

            ////SIZE
            if(innerWidth>innerHeight){
                sizeX = random(stepX/2, stepX+30);
                sizeY = random(minimumSizeY, maximumSizeY);
            
            }else{
                sizeX = random(minimumSizeX, maximumSizeX);
                sizeY = random(stepY/2, stepY+30);
            }

        masks.push(new maskRect(x+random(-50, 50), y, sizeX, sizeY));
        }
    }


    }





    /////COMMANDS


    function keyTyped() {

        ////PAUSE
        if (key === 'p') {
            running = !running;
        } else if (key === 's') {
            saveCanvas(seed + '_uncertain_index' + '.png');
        } else if (key === 'g') {
            makeGif = true;
            begin(seed);
        } else if (key === 'l') {
            makeGif = true;
            pixelDensity(0.5);
            begin(seed);
        }else if(key === '-'){
            if(res<6){
                res++;
                begin(seed);
                console.log("Resolution: "+ res);
            }
            
        }else if(key === '+'){
            if(res>=1){
                res--;
                begin(seed);
                console.log("Resolution: "+ res);
            }
            
        }
    }


    function setupGif() {
        recordedFrames = 0;

        gif = new GIF({
            workers: 2,
            quality: 40,
            framerate: 30,
            workerScript: './gif.worker.js'
        });

        gif.on('finished', function(blob) {
            print('your GIF is ready ///');
            pixelDensity(1);
            begin(seed);
            rendering = false;
            window.open(URL.createObjectURL(blob));
            setupGif();
            recordedFrames = 0;
        });

    }









    function glitchImage(img, probability) {
        
        if(t < 2000 && t%60==0){
        rrr=random(999999);
        }
        randomSeed(rrr);
        img.loadPixels();
        let originalPixels = img.pixels.slice();
    
        for (let i = 0; i < img.pixels.length; i += 4) {
        if (random(1) < probability) {
            let pasteIndex = floor(random(img.pixels.length));
            
            let segmentLength = floor(random(10, 50));
            let segmentStart = floor(random(img.pixels.length - segmentLength));
            let segmentEnd = segmentStart + segmentLength;
            let copiedPixels = originalPixels.slice(segmentStart, segmentEnd);
    
            for (let j = 0; j < copiedPixels.length; j += 4) {
            img.pixels[pasteIndex + j] = copiedPixels[j]; // Red channel
            img.pixels[pasteIndex + j + 1] = copiedPixels[j + 1]; // Green channel
            img.pixels[pasteIndex + j + 2] = copiedPixels[j + 2]; // Blue channel
            }
        }
        }
        img.updatePixels();
    }


    function weightedColor(a){
        const b=random();let c=0;
        for (let e=0;e<a.length-1;e+=2) {
        const f=a[e],g=a[e+1];
        if(c+=g,b<c) return f} 
            return a[a.length-2]
    }

    async function pngExport({ resolution: { x, y } }) {
        resizeCanvas(x, y);
        if(x<900 && x>700){res=3} else if(x<=700){res=8} else{res=0};

        begin(seed);

        // Draw the frame on the temporary canvas
        for(let i = 0; i < 1200; i++){
            t++;
            drawFrame(x, y)
        }

        return new Promise((resolve) => {
            canvas.toDataURL('image/png', (dataUrl) => {
                resolve(dataUrl);
            });
        });
    }


    async function gifExport({ resolution: { x, y } }) {
        resizeCanvas(x, y);
        if(x<900 && x>700){res=3} else if(x<=700){res=8} else{res=0};

        begin();

        // Create a new gif
        let gif = new GIF({
            workers: 2,
            quality: 10,
            width: x,
            height: y,
            workerScript: './gif.worker.js'
        });

        // Capture frames for the gif using the same method as the live drawing
        while (t <= 1200) {
            t++;
            drawFrame(x, y);

            if ((t - 1) % framesToSkip == 0 || t == 1) {
                gif.addFrame(canvas.elt, { delay: 33, copy: true });
            }
        }

        return new Promise((resolve) => {
            gif.on('finished', (blob) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            gif.render();
        });
    }

    // Add this helper function to convert canvas to data URL
    function canvasToDataURL(canvas, callback, type, encoderOptions) {
        let dataURL = canvas.elt.toDataURL(type, encoderOptions);
        callback(dataURL);
    }
