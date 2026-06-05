import { router } from 'expo-router';
import EnrollScreen from '../screens/EnrollScreen';

export default function EnrollRoute() {
  return <EnrollScreen onDone={() => router.replace('/home')} />;
}
