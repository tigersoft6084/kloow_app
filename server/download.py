from flask import Flask, request, send_file, jsonify
import os

app = Flask(__name__)

# Path to the zip file
WIN32_ZIP_FILE_PATH = "./browser.zip"
LINUX_ZIP_FILE_PATH = "./browser_linux.zip"
MAC_ZIP_FILE_PATH = "./browser_mac.tar.xz"


# File paths for each OS
SFSS_FILES = {
    "windows": "./ScreamingFrogSEOSpider_win.jar",
    "mac_intel": "./ScreamingFrogSEOSpider_mac_intel.jar",
    "mac_arm": "./ScreamingFrogSEOSpider_mac_arm.jar",
    "linux": "./ScreamingFrogSEOSpider_linux.jar",
}


# File paths for each OS
SFLA_FILES = {
    "windows": "./ScreamingFrogLogFileAnalyser_win.jar",
    "mac_intel": "./ScreamingFrogLogFileAnalyser_mac_intel.jar",
    "mac_arm": "./ScreamingFrogLogFileAnalyser_mac_arm.jar",
    "linux": "./ScreamingFrogLogFileAnalyser_linux.jar",
}


@app.route("/download", methods=["GET"])
def download_zip():
    try:
        if os.path.exists(WIN32_ZIP_FILE_PATH):
            return send_file(
                WIN32_ZIP_FILE_PATH,
                as_attachment=True,
                download_name="browser.zip",
                mimetype="application/zip",
            )
        else:
            return {"error": "File not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500


@app.route("/download_linux", methods=["GET"])
def download_zip_linux():
    try:
        if os.path.exists(LINUX_ZIP_FILE_PATH):
            return send_file(
                LINUX_ZIP_FILE_PATH,
                as_attachment=True,
                download_name="browser.zip",
                mimetype="application/zip",
            )
        else:
            return {"error": "File not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500


@app.route("/download_mac", methods=["GET"])
def download_zip_mac():
    try:
        if os.path.exists(MAC_ZIP_FILE_PATH):
            return send_file(
                MAC_ZIP_FILE_PATH,
                as_attachment=True,
                download_name="browser.tar.xz",
                mimetype="application/zip",
            )
        else:
            return {"error": "File not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500


@app.route("/download-sfss", methods=["GET"])
def download_sfss():
    try:
        os_type = request.args.get("os")

        if not os_type:
            return jsonify({"error": "Missing 'os' query parameter"}), 400

        if os_type not in SFSS_FILES:
            return jsonify({"error": f"Invalid OS type '{os_type}'"}), 400

        file_path = SFSS_FILES[os_type]

        if not os.path.exists(file_path):
            return jsonify({"error": f"File not found for '{os_type}'"}), 404

        return send_file(
            file_path,
            as_attachment=True,
            download_name=os.path.basename(file_path),
            mimetype="application/java-archive",
        )
    except Exception as e:
        return {"error": str(e)}, 500


@app.route("/download-sfla", methods=["GET"])
def download_sfla():
    try:
        os_type = request.args.get("os")

        if not os_type:
            return jsonify({"error": "Missing 'os' query parameter"}), 400

        if os_type not in SFLA_FILES:
            return jsonify({"error": f"Invalid OS type '{os_type}'"}), 400

        file_path = SFLA_FILES[os_type]

        if not os.path.exists(file_path):
            return jsonify({"error": f"File not found for '{os_type}'"}), 404

        return send_file(
            file_path,
            as_attachment=True,
            download_name=os.path.basename(file_path),
            mimetype="application/java-archive",
        )
    except Exception as e:
        return {"error": str(e)}, 500


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
