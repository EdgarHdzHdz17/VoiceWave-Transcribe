import { StatusBar } from 'expo-status-bar';
import React, {useState} from 'react';
import { Button, StyleSheet, Text, View,TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { FontAwesome5 } from '@expo/vector-icons';

export default function App() {
  const [recording, setRecording] = useState();
  const [recordings, setRecordings] = useState([]);
  const [resultSpeech, setResultSpeech] = useState("");
  
  //Funcion para iniciar grabacion
  async function startRecording() {
    try {//Permisos de microfono
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true
        });
        //Configuracion del audio
        const recordingOptions = {
          android: {
            extension: '.wav',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM,
          },
          ios: {
            extension: '.wav',
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
        };
        const { recording } = await Audio.Recording.createAsync(recordingOptions);
        setRecording(recording);
      } else {
        console.error('No se acepto los permiso');
      }
    } catch (err) {
      console.error('Fallo en accesibilidad', err);
    }
  }
  //Detencion de grabacion
  async function stopRecording() {
    setRecording(undefined);
    await Audio.setAudioModeAsync(
      {
        allowsRecordingIOS: false,
      }
    );
    await recording.stopAndUnloadAsync();
    let updatedRecordings = [...recordings];
    const fileUri = `${FileSystem.documentDirectory}recording${Date.now()}.wav`;
    await FileSystem.copyAsync({
      from: recording.getURI(),
      to: fileUri,
    });
    const { sound } = await recording.createNewLoadedSoundAsync();
    updatedRecordings.push({
      sound: sound,
      file: fileUri,
    });
    setRecordings(updatedRecordings);
    translateSpeechToText(fileUri);
    setRecordings([]);
  }

  async function translateSpeechToText(fileUri) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'audio/x-wav',
        name: 'audio.wav',
      });
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': 'Bearer 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',
        },
      });
      const resultSpeech = response.data;
      setResultSpeech(resultSpeech);//Resultado en pantalla del APP
    } catch (error) {
      console.error('Fallo de transcripcion', {...error});
    }
    try {
      await FileSystem.deleteAsync(fileUri);
      console.log(`El archivo ${fileUri} se ha eliminado correctamente.`);
    } catch (error) {
      console.error(`Error al eliminar el archivo ${fileUri}: ${error.message}`);
    }
  }


  return (
    <View style={styles.container}>

      <View style={styles.containerTitle}>
        <Text style={styles.textTitle}>VoiceWave {"\n"} Transcribe</Text>
      </View>

      <View style={styles.containerButtonRecognition}>
        <TouchableOpacity style={styles.recordButtonContainer} onPress={recording ? stopRecording : startRecording}>
          <FontAwesome5 name={recording ?"microphone-slash":"microphone"} size={80} color="#f0ffff"/>
        </TouchableOpacity>
      </View>

      <View style={styles.containerResultText}>
        <Text style={styles.textResultSpeech}>Result:{"\n"}</Text>
        <Text style={styles.textResultSpeech}>{resultSpeech}</Text>
      </View>



      
      
      
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },

  containerTitle:{
    alignItems:'center',
    width:'99%',
    height:'20%',
  },

  textTitle:{
    fontSize:45,
    color:'black',
    marginTop:'7%',
  },

  containerButtonRecognition:{
    justifyContent:'center',
    alignItems:'center',
    width:'99%',
    height:'30%',
  },

  recordButtonContainer: {
    backgroundColor: "#26627F",
    borderRadius: 80,
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },

  containerResultText:{
    alignItems:'center',
    width:'80%',
    flex:'1',
  },

  textResultSpeech:{
    fontSize:30,
    color:'black'
  },

  


});