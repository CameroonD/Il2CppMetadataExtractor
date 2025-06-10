const lineLength = 16;

let baseAddr = null;
let fileAddr = null;

function awaitForCondition() {
    var i = setInterval(function () {
        var info = Process.findModuleByName('libil2cpp.so');
        if (info) {
            console.log("\n=== libil2cpp.so base address found at: " + info.base + ' ===\n');
            clearInterval(i);
            baseAddr = info.base;

            if (metadataFunctionOffset.equals(0x0)) {
                console.log("=== No offset provided, beginning manual memory search ===\n");
                memorySearch();
            } else {
                getFileAddress();
            }
        }
    }, 100);
}

function getFileAddress() {
    let callback = function(retval) {
        fileAddr = retval;
        dumpMemory();
    }

    var metadataFile = baseAddr.add(metadataFunctionOffset);
    Interceptor.attach(metadataFile, {
        onLeave: function(retval) {
            // retval is reused by ALL onLeave functions and is reset when we leave the scope, so we have to copy it
            callback(ptr(retval.toString()));
        }
    });
}

function memorySearch() {
    let patternFound = false;
    var memoryRanges = Process.enumerateRangesSync('rw-');
    let completedSearchesCount = 0;
    memoryRanges.forEach(range => {
        Memory.scan(range.base, range.size, filePattern, {
            onMatch(address, size) {
                console.log('=== File Detected in Memory ===\n');
                fileAddr = ptr(address);
                patternFound = true;

                dumpMemory();
            },
            onComplete() {
                completedSearchesCount++;
                if (!patternFound && (completedSearchesCount === memoryRanges.length)) {
                    memorySearch();
                }
            }
        });
    });
}

function dumpMemory() {
    console.log("The first several bytes of the hex dump should look something like this:");
    console.log("---------------\n| af 1b b1 fa |\n---------------\n");
    console.log("Your Hexdump:\n" + hexdump(ptr(fileAddr)) + '\n');
    var basePointer = ptr(fileAddr);

    let length = 0;
    if (!fileSize) {
        console.log("=== File size unspecified, automatically asessing file size ===\n");

        var p = ptr(fileAddr);
        let loop = true;
        let currBytes = [];
        let emptyLineCount = 0;
        while (loop) {
            Memory.protect(p, lineLength, 'rwx');
            currBytes = p.readByteArray(lineLength);
            let uintArr = new Uint8Array(currBytes);
    
            if (uintArr.every(item => item == 0)){
                if (emptyLineCount >= 5) {
                    length = length - (lineLength * emptyLineCount);
                    break;
                }
                emptyLineCount++;
            } else if (emptyLineCount !== 0) {
                emptyLineCount = 0;
            }
            length += lineLength
            p = p.add(lineLength);
        }
    } else {
        console.log(`=== Manually setting file size to ${fileSize} bytes ===\n`);
        length = fileSize;
    }

    send("=== File Dumped From Memory ===", basePointer.readByteArray(length));
}

awaitForCondition();
