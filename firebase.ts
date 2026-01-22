/***************************************************
 * ESP8266 MakeCode Library - FIREBASE ENHANCED
 * Enhanced blocks untuk Firebase dengan parsing JSON yang lebih baik
 ***************************************************/

namespace esp8266 {
    // ==================== FIREBASE READ ENHANCED ====================
    
    /**
     * Read STRING value from Firebase (improved parsing)
     */
    //% subcategory="Firebase"
    //% weight=23
    //% blockGap=8
    //% blockId=esp8266_read_firebase_string
    //% block="Firebase read STRING of %deviceName"
    //% deviceName.defl="status"
    export function readFirebaseString(deviceName: string): string {
        // Validate WiFi connection
        if (!isWifiConnected()) return ""

        // Validate Firebase configuration
        if (firebaseDatabaseURL == "" || firebaseApiKey == "") return ""

        // Build full path
        let fullPath = cleanPath(firebasePath + "/" + deviceName + "/value")
        let host = extractHost(firebaseDatabaseURL)

        // Connect to Firebase via SSL
        if (!sendCommand("AT+CIPSTART=\"SSL\",\"" + host + "\",443", "OK", 5000)) {
            return ""
        }

        // Build GET request
        let requestPath = "/" + fullPath + ".json?auth=" + firebaseApiKey
        let httpRequest = "GET " + requestPath + " HTTP/1.1\r\n"
        httpRequest += "Host: " + host + "\r\n"
        httpRequest += "Connection: close\r\n"
        httpRequest += "\r\n"

        // Send request
        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, "OK", 2000)) {
            sendCommand("AT+CIPCLOSE", "OK", 1000)
            return ""
        }

        serial.writeString(httpRequest)
        basic.pause(100)

        // Wait for response
        let response = getResponse("", 3000)

        // Close connection
        sendCommand("AT+CIPCLOSE", "OK", 500)

        // Parse response
        if (response.indexOf("200 OK") < 0) return ""
        
        // Find JSON body (after double CRLF)
        let bodyStart = response.indexOf("\r\n\r\n")
        if (bodyStart < 0) return ""
        
        let body = response.substr(bodyStart + 4)
        
        // Remove "null" responses
        if (body.indexOf("null") >= 0) return ""
        
        // Extract string value (remove quotes)
        if (body.charAt(0) == "\"") {
            let endQuote = body.indexOf("\"", 1)
            if (endQuote > 0) {
                return body.substr(1, endQuote - 1)
            }
        }
        
        // Return as-is for numbers
        let cleanBody = ""
        for (let i = 0; i < body.length; i++) {
            let char = body.charAt(i)
            if ((char >= "0" && char <= "9") || char == "." || char == "-") {
                cleanBody += char
            } else if (cleanBody.length > 0) {
                break
            }
        }
        
        return cleanBody
    }

    /**
     * Read BOOLEAN value from Firebase
     */
    //% subcategory="Firebase"
    //% weight=22
    //% blockGap=8
    //% blockId=esp8266_read_firebase_boolean
    //% block="Firebase read BOOLEAN of %deviceName"
    //% deviceName.defl="relay"
    export function readFirebaseBoolean(deviceName: string): boolean {
        let value = readFirebaseString(deviceName)
        return value == "1" || value == "true" || value == "TRUE"
    }

    // ==================== FIREBASE WRITE BLOCKS ====================
    
    /**
     * Write simple NUMBER to Firebase
     */
    //% subcategory="Firebase"
    //% weight=21
    //% blockGap=8
    //% blockId=esp8266_firebase_write_number
    //% block="Firebase write NUMBER|name %deviceName|value %value"
    //% deviceName.defl="counter"
    //% value.defl=0
    export function firebaseWriteNumber(deviceName: string, value: number) {
        let json = "{\"" + deviceName + "\":{\"value\":" + value + "}}"
        sendFirebaseData(firebasePath, json)
    }

    /**
     * Write simple STRING to Firebase
     */
    //% subcategory="Firebase"
    //% weight=20
    //% blockGap=8
    //% blockId=esp8266_firebase_write_string
    //% block="Firebase write STRING|name %deviceName|value %value"
    //% deviceName.defl="status"
    //% value.defl="OK"
    export function firebaseWriteString(deviceName: string, value: string) {
        let json = "{\"" + deviceName + "\":{\"value\":\"" + value + "\"}}"
        sendFirebaseData(firebasePath, json)
    }

    /**
     * Write simple BOOLEAN to Firebase
     */
    //% subcategory="Firebase"
    //% weight=19
    //% blockGap=8
    //% blockId=esp8266_firebase_write_boolean
    //% block="Firebase write BOOLEAN|name %deviceName|value %value"
    //% deviceName.defl="relay"
    //% value.defl=true
    export function firebaseWriteBoolean(deviceName: string, value: boolean) {
        let val = value ? 1 : 0
        let json = "{\"" + deviceName + "\":{\"value\":" + val + "}}"
        sendFirebaseData(firebasePath, json)
    }

    // ==================== FIREBASE COMMAND BLOCKS ====================
    
    /**
     * Check if device command is ON (1 or true)
     */
    //% subcategory="Firebase"
    //% weight=18
    //% blockGap=8
    //% blockId=esp8266_firebase_is_on
    //% block="Firebase %deviceName is ON"
    //% deviceName.defl="relay1"
    export function firebaseIsOn(deviceName: string): boolean {
        return readFirebaseBoolean(deviceName)
    }

    /**
     * Check if device command is OFF (0 or false)
     */
    //% subcategory="Firebase"
    //% weight=17
    //% blockGap=8
    //% blockId=esp8266_firebase_is_off
    //% block="Firebase %deviceName is OFF"
    //% deviceName.defl="relay1"
    export function firebaseIsOff(deviceName: string): boolean {
        return !readFirebaseBoolean(deviceName)
    }

    /**
     * Get dimmer/slider value from Firebase (0-1024)
     */
    //% subcategory="Firebase"
    //% weight=16
    //% blockGap=8
    //% blockId=esp8266_firebase_get_dimmer
    //% block="Firebase get DIMMER value|%deviceName"
    //% deviceName.defl="brightness"
    export function firebaseGetDimmer(deviceName: string): number {
        let valueStr = readFirebaseString(deviceName)
        if (valueStr == "") return 0
        
        let result = 0
        for (let i = 0; i < valueStr.length; i++) {
            let char = valueStr.charAt(i)
            if (char >= "0" && char <= "9") {
                result = result * 10 + (char.charCodeAt(0) - 48)
            }
        }
        return result
    }

    /**
     * Get slider value in percentage (0-100)
     */
    //% subcategory="Firebase"
    //% weight=15
    //% blockGap=40
    //% blockId=esp8266_firebase_get_percentage
    //% block="Firebase get PERCENTAGE|%deviceName"
    //% deviceName.defl="brightness"
    export function firebaseGetPercentage(deviceName: string): number {
        let value = firebaseGetDimmer(deviceName)
        return Math.round((value * 100) / 1024)
    }

    // ==================== FIREBASE MULTI DATA ====================
    
    /**
     * Send multiple sensor readings at once
     */
    //% subcategory="Firebase"
    //% weight=14
    //% blockGap=8
    //% blockId=esp8266_firebase_send_multi_sensor
    //% block="Firebase send sensors|temp %temp|humid %humid|light %light"
    //% temp.defl=25
    //% humid.defl=60
    //% light.defl=500
    export function firebaseSendMultiSensor(temp: number, humid: number, light: number) {
        let json = "{"
        json += "\"temperature\":{\"tipe\":\"sensor\",\"value\":" + temp + ",\"satuan\":\"C\"},"
        json += "\"humidity\":{\"tipe\":\"sensor\",\"value\":" + humid + ",\"satuan\":\"%\"},"
        json += "\"light\":{\"tipe\":\"sensor\",\"value\":" + light + ",\"satuan\":\"lux\"}"
        json += "}"
        sendFirebaseData(firebasePath, json)
    }

    /**
     * Send custom JSON to Firebase path
     */
    //% subcategory="Firebase"
    //% weight=13
    //% blockGap=40
    //% blockId=esp8266_firebase_send_json
    //% block="Firebase send JSON|%jsonData"
    //% jsonData.defl='{"status":"OK"}'
    export function firebaseSendJSON(jsonData: string) {
        sendFirebaseData(firebasePath, jsonData)
    }

    // ==================== FIREBASE DELETE ====================
    
    /**
     * Delete device data from Firebase
     */
    //% subcategory="Firebase"
    //% weight=12
    //% blockGap=8
    //% blockId=esp8266_firebase_delete
    //% block="Firebase DELETE %deviceName"
    //% deviceName.defl="old_sensor"
    export function firebaseDelete(deviceName: string) {
        // Validate WiFi connection
        if (!isWifiConnected()) return

        // Validate Firebase configuration
        if (firebaseDatabaseURL == "" || firebaseApiKey == "") return

        let fullPath = cleanPath(firebasePath + "/" + deviceName)
        let host = extractHost(firebaseDatabaseURL)

        // Connect to Firebase
        if (!sendCommand("AT+CIPSTART=\"SSL\",\"" + host + "\",443", "OK", 3000)) {
            return
        }

        // Build DELETE request
        let requestPath = "/" + fullPath + ".json?auth=" + firebaseApiKey
        let httpRequest = "DELETE " + requestPath + " HTTP/1.1\r\n"
        httpRequest += "Host: " + host + "\r\n"
        httpRequest += "Connection: close\r\n"
        httpRequest += "\r\n"

        // Send request
        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, "OK")) {
            sendCommand("AT+CIPCLOSE", "OK", 1000)
            return
        }

        serial.writeString(httpRequest)
        basic.pause(500)

        // Close connection
        sendCommand("AT+CIPCLOSE", "OK", 500)
    }

    // ==================== HELPER FUNCTIONS (must be public for firebase.ts) ====================
    
    /**
     * Clean path helper - remove leading slash
     */
    //% blockHidden=true
    export function cleanPath(path: string): string {
        if (path.charAt(0) == "/") {
            return path.substr(1)
        }
        return path
    }

    /**
     * Extract host helper - remove protocol and trailing slash
     */
    //% blockHidden=true
    export function extractHost(url: string): string {
        let host = url
        if (host.indexOf("https://") >= 0) {
            host = host.substr(8)
        }
        if (host.indexOf("http://") >= 0) {
            host = host.substr(7)
        }
        if (host.charAt(host.length - 1) == "/") {
            host = host.substr(0, host.length - 1)
        }
        return host
    }
}
