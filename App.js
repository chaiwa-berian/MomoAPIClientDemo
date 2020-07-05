import { Buffer } from "buffer";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Picker,
  Button,
} from "react-native";
import { Base64 } from "js-base64";

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const user = "c4f6d33d-ea76-4609-b816-a99dc801b532"; // replace with your provisioned user id or find help here(https://gist.github.com/chaiwa-berian/5294fdf1360247cf4561c95c8fa740d4)
  const apiKey = "1e79774dabd944b4b113c30aaef5b2c8"; // replace with your provisioned apikey or find help here(https://gist.github.com/chaiwa-berian/5294fdf1360247cf4561c95c8fa740d4)
  const [bearerToken, setBearerToken] = useState({
    accessToken: "",
    expiresIn: "",
    issuedAt: "",
    expiresAt: "",
  });
  const [selectedValue, setSelectedValue] = useState("CreateBearerToken");
  const baseURL = "https://sandbox.momodeveloper.mtn.com";
  const [responseObject, setResponseObject] = useState({});

  let tokenExpired = () => {
    if (bearerToken.expiresAt != "") {
      return bearerToken.expiresAt < Date.now() ? "true" : "false";
    }
    return;
  };

  // Step 1. Get Access Token
  async function createNewBearerToken() {
    try {
      let requestPath = "/collection/token/";
      let url = baseURL + requestPath;

      let userApiKeyPair = `${user}:${apiKey}`;
      let auth = await Base64.encode(userApiKeyPair); //you need to encode api user and api key as Base64

      let requestHeaders = {
        Accept: "application/json",
        Authorization: "Basic " + auth,
        "Ocp-Apim-Subscription-Key": "b44728c249c24d8bb11d8b8592f4f5a7", //replace with your subscription key
        "X-Target-Environment": "sandbox",
      };

      let response = await fetch(url, {
        method: "POST",
        headers: requestHeaders,
        mode: "cors",
      });
      let responseData = response.status == 200 ? await response.json() : null;
      setResponseObject({
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        data: responseData,
      });
      if (response.status == 200) {
        let now = new Date();
        let time_milliseconds = now.getTime() + responseData.expires_in * 1000;
        setBearerToken({
          accessToken: responseData.access_token,
          expiresIn: responseData.expires_in,
          issuedAt: now.toString(),
          expiresAt: time_milliseconds,
        });
      }
    } catch (error) {
      setResponseObject({
        status: error.status || null,
        ok: error.ok || null,
        statusText: error.statusText || null,
        data: error.message,
      });
      console.log("Error in create new token method:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2. Request To Pay
  async function requestToPay() {
    try {
      let requestPath = "/collection/v1_0/requesttopay";
      let url = baseURL + requestPath;

      let xRefResponse = await fetch(
        "https://www.uuidgenerator.net/api/version4",
        {
          method: "GET",
        }
      );
      let xRefId = await xRefResponse.text();
      console.log("xRef: ", xRefId);

      let requestBody = JSON.stringify(
        {
          amount: "700.0",
          currency: "EUR",
          externalId: "097411060",
          payer: {
            partyIdType: "MSISDN",
            partyId: "260962217314",
          },
          payerMessage: "SILC Savings",
          payeeNote: "SILC Savings",
        },
        null,
        2
      );

      let contentLength = Buffer.byteLength(requestBody, "utf8");

      let token = `Bearer ${bearerToken.accessToken}`;

      let newRequestHeaders = new Headers();
      newRequestHeaders.append("Accept", "application/json");
      newRequestHeaders.append("X-Reference-Id", xRefId);
      newRequestHeaders.append(
        "Ocp-Apim-Subscription-Key",
        "b44728c249c24d8bb11d8b8592f4f5a7"
      );
      newRequestHeaders.append("X-Target-Environment", "sandbox");
      newRequestHeaders.append("Host", "sandbox.momodeveloper.mtn.com");
      newRequestHeaders.append("Content-Type", "application/json");
      newRequestHeaders.append("Content-Length", contentLength);
      newRequestHeaders.append("Authorization", token);

      let request = new Request(url, {
        method: "POST",
        headers: newRequestHeaders,
        body: requestBody,
      });

      let response = await fetch(request);
      console.log("request headers: ", JSON.stringify(request.headers));
      let responseData = await response.text();

      setResponseObject({
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        data: responseData || null,
      });

      console.log("Request to pay respose:", JSON.stringify(response));
    } catch (error) {
      setResponseObject({
        status: error.status || null,
        ok: error.ok || null,
        statusText: error.statusText || null,
        data: error.message,
      });
      console.log("Error in requestToPay method:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text h1 style={{ fontWeight: "bold" }}>
        MTN MoMo API Client Demo!
      </Text>
      <Text h2 style={{ fontWeight: "bold" }}>
        Access Token
      </Text>
      <Text>{bearerToken.accessToken}</Text>
      <Text h3>Issued at: {bearerToken.issuedAt}</Text>
      <Text h3>
        Expires at:{" "}
        {bearerToken.expiresAt == ""
          ? ""
          : new Date(bearerToken.expiresAt).toString()}
      </Text>
      <Text h3>Token Expired?: {tokenExpired()}</Text>

      <Picker
        selectedValue={selectedValue}
        onValueChange={(itemValue, itemIndex) => setSelectedValue(itemValue)}
        style={{ height: 50, width: 250 }}
      >
        <Picker.Item label="Get New Access Token" value="CreateBearerToken" />
        <Picker.Item label="Request To Pay" value="RequestToPay" />
      </Picker>

      <Button
        title="Run"
        onPress={() => {
          if (selectedValue == "CreateBearerToken") {
            setIsLoading(true);
            createNewBearerToken();
          } else if (selectedValue == "RequestToPay") {
            setIsLoading(true);
            requestToPay();
          }
        }}
      />

      <View style={styles.subcontainer}>
        <Text h1 style={{ fontWeight: "bold" }}>
          SERVER RESPONSE
        </Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.subcontainer}>
            <Text
              h2
            >{`Status: ${responseObject.status}; OK: ${responseObject.ok}; StatusText: ${responseObject.statusText}`}</Text>
            <Text h2 style={{ fontWeight: "bold" }}>
              Response Data
            </Text>
            <Text>{JSON.stringify(responseObject.data)}</Text>
          </View>
        )}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  subcontainer: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
