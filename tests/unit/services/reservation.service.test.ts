import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createReservationService } from '../../../src/services/reservation.service.js';
import type { IReservationRepository } from '../../../src/interfaces/reservation.repository.interface.js';
import { ReservationConflictError } from '../../../src/errors/reservation.errors.js';
import { SeatStatus } from '../../../src/enums/seat-status.js';

describe('ReservationService', () => {
    let mockReservationRepository: IReservationRepository;

    beforeEach(() => {
        mockReservationRepository = {
            reserve: vi.fn().mockResolvedValue(undefined),
            lockSeatsForReservation: vi.fn(),
        };
    });

    describe('reserve', () => {
        it('calls repository.reserve with eventId and seat ids (happy path)', async () => {
            const service = createReservationService(mockReservationRepository);
            await service.reserve('ev-1', ['s1', 's2']);
            expect(mockReservationRepository.reserve).toHaveBeenCalledWith('ev-1', ['s1', 's2']);
        });
    });

    describe('lockSeatsForReservation', () => {
        it('returns reserved seats (happy path)', async () => {
            const seats = [
                { id: 's1', section: 'A', row: '1', seatNumber: 1, status: SeatStatus.Reserved },
                { id: 's2', section: 'A', row: '1', seatNumber: 2, status: SeatStatus.Reserved },
            ];
            vi.mocked(mockReservationRepository.lockSeatsForReservation).mockResolvedValue(seats);
            const service = createReservationService(mockReservationRepository);
            const result = await service.lockSeatsForReservation('user-1', 'ev-1', ['s1', 's2']);
            expect(result).toHaveLength(2);
            expect(result[0]?.id).toBe('s1');
            expect(mockReservationRepository.lockSeatsForReservation).toHaveBeenCalledWith(
                'user-1',
                'ev-1',
                ['s1', 's2']
            );
        });

        it('propagates ReservationConflictError when seats not available', async () => {
            vi.mocked(mockReservationRepository.lockSeatsForReservation).mockRejectedValue(
                new ReservationConflictError()
            );
            const service = createReservationService(mockReservationRepository);
            await expect(service.lockSeatsForReservation('user-1', 'ev-1', ['s1'])).rejects.toThrow(
                ReservationConflictError
            );
        });
    });
});
