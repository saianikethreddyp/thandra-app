import { fireEvent, render, screen } from '@testing-library/react-native';

import CarDetailScreen from '../app/car/[id]';

const mockReplace = jest.fn();
const mockMutate = jest.fn();
const mockUpload = jest.fn();
const mockAccess = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'car-1' }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/contacts/sync', () => ({ uploadContactsForBooking: (id: string) => mockUpload(id), ensureContactsAccess: () => mockAccess() }));
jest.mock('@/components/DateTimeField', () => ({ DateTimeField: () => null }));
jest.mock('@/api/hooks', () => ({
  useCar: () => ({
    isLoading: false,
    data: { id: 'car-1', hub_id: 'h1', hub_name: 'Madhapur', brand: 'Maruti', model: 'Swift', year: 2023, fuel_type: 'petrol', transmission: 'manual', seats: 5, price_per_day: 2000, photos: [] },
  }),
  useHubs: () => ({ data: [] }),
  useCreateBooking: () => ({ mutateAsync: mockMutate, isPending: false }),
}));

describe('booking form (no login)', () => {
  beforeEach(() => { mockReplace.mockClear(); mockMutate.mockReset(); mockUpload.mockReset().mockResolvedValue('saved'); mockAccess.mockReset().mockResolvedValue('granted'); });

  it('does not book until every detail is valid', async () => {
    await render(<CarDetailScreen />);
    await fireEvent.press(screen.getByText('Book this car'));
    expect(screen.getByText('Enter your full name.')).toBeTruthy();
    expect(screen.getByText('Enter the 12-digit Aadhaar number.')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  async function fillAndBook() {
    await render(<CarDetailScreen />);
    await fireEvent.changeText(screen.getByLabelText('Full name'), 'Asha Rao');
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '98765 43210');
    await fireEvent.changeText(screen.getByLabelText('Address'), '12-3 Road No 4, Madhapur, Hyderabad');
    await fireEvent.changeText(screen.getByLabelText('Aadhaar number'), '234567890123');
    await fireEvent.changeText(screen.getByLabelText('Driving licence number'), 'ts09 20110012345');
    await fireEvent.press(screen.getByText('Book this car'));
    await screen.findByText('Book this car');
  }

  it('does not book when contacts access is refused', async () => {
    mockAccess.mockResolvedValue('denied');
    await fillAndBook();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not book when contacts access is blocked in Settings', async () => {
    mockAccess.mockResolvedValue('blocked');
    await fillAndBook();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('sends the details and opens the confirmation', async () => {
    mockMutate.mockResolvedValue({ id: 'b1' });
    await fillAndBook();
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ car_id: 'car-1', full_name: 'Asha Rao', phone: '9876543210', aadhaar: '234567890123', driving_licence: 'TS0920110012345' }));
    expect(mockUpload).toHaveBeenCalledWith('b1');
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/booking/[id]', params: { id: 'b1' } });
  });
});
