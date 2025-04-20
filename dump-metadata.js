const lineLength = 16;

let baseAddr = null;
let fileAddr = null;

function awaitForCondition() {
    var i = setInterval(function () {
        var info = Process.findModuleByName('libil2cpp.so');
        if (info) {
            console.log("libil2cpp base address found at: " + info.base);
            clearInterval(i);
            baseAddr = info.base;
            getFileAddress();
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

function dumpMemory() {
    console.log("=== The first several bytes of the hex dump should look something like this: ===");
    console.log("---------------\n| af 1b b1 fa |\n---------------");
    console.log("Your Hexdump:\n" + hexdump(ptr(fileAddr)));
    var basePointer = ptr(fileAddr);

    var p = ptr(fileAddr);
    let length = 0;
    let loop = true;
    let currBytes = [];
    let emptyLineCount = 0;
    while(loop) {
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
    send("=== File Dumped From Memory ===", basePointer.readByteArray(length));
}

awaitForCondition();
