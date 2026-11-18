import { fireEvent, render, screen } from '@testing-library/react-native';

import LoginScreen from '../app/login';

const mockPush = jest.fn();
const mockRequestOtp = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), dismiss: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ requestOtp: mockRequestOtp }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

describe('LoginScreen', () => {
  beforeEach(() => { mockPush.mockClear(); mockRequestOtp.mockReset(); });

  it('rejects an invalid number without calling the API', async () => {
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '12345');
    await fireEvent.press(screen.getByText('Send code'));
    expect(screen.getByText('Enter a valid 10-digit mobile number.')).toBeTruthy();
    expect(mockRequestOtp).not.toHaveBeenCalled();
  });

  it('sends the code and moves to verification', async () => {
    mockRequestOtp.mockResolvedValue(undefined);
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '98765 43210');
    await fireEvent.press(screen.getByText('Send code'));
    await screen.findByText('Send code');
    expect(mockRequestOtp).toHaveBeenCalledWith('9876543210', 'login');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/verify', params: { phone: '9876543210', intent: 'login' } });
  });
});
