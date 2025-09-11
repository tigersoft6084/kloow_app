sudo cp cert.crt /usr/local/share/ca-certificates/cert.crt
sudo dpkg-reconfigure ca-certificates
sudo update-ca-certificates


openssl crl2pkcs7 -nocrl -certfile /etc/ssl/certs/ca-certificates.crt | openssl pkcs7 -print_certs -noout | grep HTTP-MITM-PROX



Chromium  --proxy-server="http://5.161.87.62:3000" --start-maximized "https://semrush.com/init-seoc-session?iv=MJTepX6wSOQVR/SMHLuz/w==&token=Kv9FqL1O+ppX+376gWlutG4gXvVdFVCtSxrB8fGveBQnWu+2VQ92vGuOEjcryKmSsKsRfZTeI9O4YH5VvxlV+SZ8g1hg/M4me2z9MwpcA08O8/qwYrgH3Z6Wj0WQIMkHiEbUD7yuIlbmGbD94mczjBwrfYW9OdqjxpGs9il0pco4LO6LP4u7GTbCse7DY5kOu6jAh93aaZb+dxhUXfVU4vwrB98ySFkRWfvOooe7EP6jvga+XExbsgiH9ZBXD2id"


openssl x509 -in /usr/local/share/ca-certificates/cert.crt -text -noout

openssl x509 -in /usr/share/ca-certificates/cert.crt -text -noout


certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "ProxyLogin Root CA" -i /usr/local/share/ca-certificates/cert.crt


certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "ProxyLogin Root CA" -i /usr/lib/proxylogin/resources/cert.crt


open -na Chromium.app/Contents/MacOS/Chromium --args --proxy-server="http://5.161.87.62:3000" --start-maximized "https://semrush.com/init-seoc-session?iv=MJTepX6wSOQVR/SMHLuz/w==&token=Kv9FqL1O+ppX+376gWlutG4gXvVdFVCtSxrB8fGveBQnWu+2VQ92vGuOEjcryKmSsKsRfZTeI9O4YH5VvxlV+SZ8g1hg/M4me2z9MwpcA08O8/qwYrgH3Z6Wj0WQIMkHiEbUD7yuIlbmGbD94mczjBwrfYW9OdqjxpGs9il0pco4LO6LP4u7GTbCse7DY5kOu6jAh93aaZb+dxhUXfVU4vwrB98ySFkRWfvOooe7EP6jvga+XExbsgiH9ZBXD2id"



sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.crt

Chromium.app/Contents/MacOS/Chromium --proxy-server="http://5.161.87.62:3000" --start-maximized "https://semrush.com/init-seoc-session?iv=MJTepX6wSOQVR/SMHLuz/w==&token=Kv9FqL1O+ppX+376gWlutG4gXvVdFVCtSxrB8fGveBQnWu+2VQ92vGuOEjcryKmSsKsRfZTeI9O4YH5VvxlV+SZ8g1hg/M4me2z9MwpcA08O8/qwYrgH3Z6Wj0WQIMkHiEbUD7yuIlbmGbD94mczjBwrfYW9OdqjxpGs9il0pco4LO6LP4u7GTbCse7DY5kOu6jAh93aaZb+dxhUXfVU4vwrB98ySFkRWfvOooe7EP6jvga+XExbsgiH9ZBXD2id"


sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.crt


"/Users/dev/Library/Application Support/ProxyLogin/Browser/1.0.0/687a51e938c9703aecaed494/Chromium.app/Contents/MacOS/Chromium" --proxy-server="http://5.161.87.62:3000" --start-maximized "https://semrush.com/init-seoc-session?iv=MJTepX6wSOQVR/SMHLuz/w==&token=Kv9FqL1O+ppX+376gWlutG4gXvVdFVCtSxrB8fGveBQnWu+2VQ92vGuOEjcryKmSsKsRfZTeI9O4YH5VvxlV+SZ8g1hg/M4me2z9MwpcA08O8/qwYrgH3Z6Wj0WQIMkHiEbUD7yuIlbmGbD94mczjBwrfYW9OdqjxpGs9il0pco4LO6LP4u7GTbCse7DY5kOu6jAh93aaZb+dxhUXfVU4vwrB98ySFkRWfvOooe7EP6jvga+XExbsgiH9ZBXD2id"


/Users/dev/Library/Application Support/ProxyLogin/Browser/1.0.0/687a51e938c9703aecaed494/Chromium.app/Contents/MacOS/Chromium

/Users/dev/Library/Application Support/ProxyLogin/Browser/1.0.0/687a51e938c9703aecaed494/chrome-mac/Chromium.app/Contents/MacOS/Chromium
/Users/dev/Library/Application Support/ProxyLogin/Browser/1.0.0/687a51e938c9703aecaed494/chrome-mac/Chromium.app/Contents/Frameworks/Chromium Framework.framework/Versions/141.0.7365.0/Helpers/chrome_crashpad_handler

`"${executablePath}"`


osascript -e 'do shell script "sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /Applications/proxylogin.app/Contents/Resources/cert.crt" with administrator privileges'




Command failed: osascript -e 'do shell script "security add-trusted-cert -d -r trustAsRoot -p ssl -k /Library/Keychains/System.keychain \"/Applications/proxylogin.app/Contents/Resources/cert.crt\"" with administrator privileges' 0:197: execution error: SecTrustSettingsSetTrustSettings: One or more parameters passed to a function were not valid. (1)

Command failed: osascript -e 'do shell script "security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /Applications/proxylogin.app/Contents/Resources/cert.crt" with administrator privileges' 0:189: execution error: SecTrustSettingsSetTrustSettings: The authorization was denied since no user interaction was possible. (1)


# Create a custom keychain
security create-keychain -p proxylogin ~/Library/Keychains/mykeychain.keychain
security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/mykeychain.keychain /Applications/proxylogin.app/Contents/Resources/cert.crt
security unlock-keychain -p proxylogin ~/Library/Keychains/mykeychain.keychain
certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "ProxyLogin Root CA" -i /Applications/proxylogin.app/Contents/Resources/cert.crt
certutil -d sql:$HOME/.pki/nssdb -L



open -na "/Users/dev/Library/Application Support/ProxyLogin/Browser/1.0.0/687a51e938c9703aecaed494/Chromium.app/Contents/MacOS/Chromium" --args --proxy-server="http://5.161.87.62:3000" --start-maximized "https://semrush.com/init-seoc-session?iv=MJTepX6wSOQVR/SMHLuz/w==&token=Kv9FqL1O+ppX+376gWlutG4gXvVdFVCtSxrB8fGveBQnWu+2VQ92vGuOEjcryKmSsKsRfZTeI9O4YH5VvxlV+SZ8g1hg/M4me2z9MwpcA08O8/qwYrgH3Z6Wj0WQIMkHiEbUD7yuIlbmGbD94mczjBwrfYW9OdqjxpGs9il0pco4LO6LP4u7GTbCse7DY5kOu6jAh93aaZb+dxhUXfVU4vwrB98ySFkRWfvOooe7EP6jvga+XExbsgiH9ZBXD2id"


unzip ProxyLogin-darwin-x64-1.0.0.zip -d ProxyLogin-darwin-x64-1.0.0


pkgbuild --root out/make/zip/darwin/x64/ProxyLogin-darwin-x64-1.0.0 --identifier com.proxylogin --version 1.0.0 --install-location /Applications out/make/zip/darwin/x64/ProxyLogin-darwin-x64-1.0.0.pkg

pkgbuild --root ProxyLogin-darwin-x64-1.0.0 --identifier com.proxylogin --install-location "/Library" ProxyLogin-darwin-x64-1.0.0.pkg


sudo installer -pkg ProxyLogin-darwin-x64-1.0.0.pkg -target /
pkgutil --files com.proxylogin