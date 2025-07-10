from flask import Flask, send_file
import os

app = Flask(__name__)

# Path to the zip file
ZIP_FILE_PATH = "./download/browser.zip"

@app.route('/download', methods=['GET'])
def download_zip():
    try:
        if os.path.exists(ZIP_FILE_PATH):
            return send_file(
                ZIP_FILE_PATH,
                as_attachment=True,
                download_name='browser.zip',
                mimetype='application/zip'
            )
        else:
            return {"error": "File not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)