import sys
import frida
import os
import time

wait_for_response = True

def save_file(message, data):
    print(message['payload'])
    dump_name = "global-metadata.dump.dat"

    with open(dump_name, "wb") as f:
        f.write(data)
        f.close()
        global wait_for_response
        wait_for_response = False

if __name__ == "__main__":

    if len(sys.argv) < 3:
        print('Usage: python dump-metadata.py package_name (ex: com.company.appname) offset (ex: 0x1234567)')
        exit(0)

    package_name = sys.argv[1]
    offset = sys.argv[2]

    device = frida.get_usb_device()
    pid = device.spawn(package_name)
    session = device.attach(pid)

    # pass initial settings into the script before injection
    settings = f"const metadataFunctionOffset=ptr({offset});"

    script = session.create_script(settings + open(os.path.dirname(os.path.abspath(__file__)) + "/dump-metadata.js", "r").read())
    script.on('message', save_file)
    script.load()

    device.resume(pid)

    while wait_for_response:
        time.sleep(0.05)
