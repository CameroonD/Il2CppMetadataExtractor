import frida
import os
import time
import argparse

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
    parser = argparse.ArgumentParser(
        prog='dump-metadata.py',
        description='Simple and easy to use Frida script for dumping decrypted Il2cpp global-metadata.dat files from a Unity application\'s memory.'
    )
    parser.add_argument('package_name', help='Name of the target application ex: com.company.appname')
    parser.add_argument('offset', help='Offset of a function which would return a pointer to the metadata file, see readme')
    parser.add_argument('-s', '--size', help='An optional parameter to manually specify the size of the file', required=False, default=0)

    args = parser.parse_args()

    package_name = args.package_name
    offset = args.offset
    file_size = args.size

    if file_size == 0:
        print('=== Automatically assessing file size ===\n')
    else:
        print(f'=== Manually setting file size to {file_size} bytes ===\n')

    device = frida.get_usb_device()
    pid = device.spawn(package_name)
    session = device.attach(pid)

    # pass initial settings into the script before injection
    settings = f"const metadataFunctionOffset=ptr({offset}); const fileSize={file_size};"

    script = session.create_script(settings + open(os.path.dirname(os.path.abspath(__file__)) + "/dump-metadata.js", "r").read())
    script.on('message', save_file)
    script.load()

    device.resume(pid)

    while wait_for_response:
        time.sleep(0.05)
