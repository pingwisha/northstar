import { describe, expect, it } from 'vitest';
import { isDue, isPushEndpoint, localHour, parseHour, reminderText } from './reminders';

describe('isPushEndpoint', () => {
	it('accepts the addresses of the big push services only', () => {
		expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
		expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
		expect(isPushEndpoint('https://web.push.apple.com/abc')).toBe(true);
		expect(isPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=1')).toBe(true);
	});

	it('refuses other sites, plain http, passwords in the address and look-alike hosts', () => {
		expect(isPushEndpoint('https://evil.example/fcm.googleapis.com')).toBe(false);
		expect(isPushEndpoint('https://fcm.googleapis.com.evil.example/x')).toBe(false);
		expect(isPushEndpoint('http://fcm.googleapis.com/x')).toBe(false);
		expect(isPushEndpoint('https://user:pw@fcm.googleapis.com/x')).toBe(false);
		expect(isPushEndpoint('не адрес')).toBe(false);
		expect(isPushEndpoint(`https://fcm.googleapis.com/${'a'.repeat(1000)}`)).toBe(false);
		expect(isPushEndpoint(undefined)).toBe(false);
	});
});

describe('parseHour', () => {
	it('takes whole hours from 0 to 23', () => {
		expect(parseHour('9')).toBe(9);
		expect(parseHour('0')).toBe(0);
		expect(parseHour('23')).toBe(23);
		expect(parseHour('24')).toBeNull();
		expect(parseHour('-1')).toBeNull();
		expect(parseHour('9.5')).toBeNull();
		expect(parseHour('')).toBeNull();
	});
});

describe('isDue', () => {
	const at = new Date('2026-11-23T06:10:00Z');

	it('is due in the local hour of the subscription, in its own zone', () => {
		expect(localHour(at, 'UTC')).toBe(6);
		expect(localHour(at, 'Asia/Tokyo')).toBe(15);
		expect(isDue({ timezone: 'Asia/Tokyo', hour: 15, lastSentOn: null }, at)).toBe(true);
		expect(isDue({ timezone: 'UTC', hour: 15, lastSentOn: null }, at)).toBe(false);
	});

	it('stays due for two more hours, so a busy hour can spill over, but not before or after', () => {
		expect(isDue({ timezone: 'UTC', hour: 5, lastSentOn: null }, at)).toBe(true);
		expect(isDue({ timezone: 'UTC', hour: 4, lastSentOn: null }, at)).toBe(true);
		expect(isDue({ timezone: 'UTC', hour: 3, lastSentOn: null }, at)).toBe(false);
		expect(isDue({ timezone: 'UTC', hour: 7, lastSentOn: null }, at)).toBe(false);
	});

	it('sends once per local day', () => {
		expect(isDue({ timezone: 'UTC', hour: 6, lastSentOn: '2026-11-23' }, at)).toBe(false);
		expect(isDue({ timezone: 'UTC', hour: 6, lastSentOn: '2026-11-22' }, at)).toBe(true);
	});

	it('falls back to the default zone for an unknown name', () => {
		expect(() => isDue({ timezone: 'Nowhere/Land', hour: 7, lastSentOn: null }, at)).not.toThrow();
	});
});

describe('reminderText', () => {
	it('stays silent when there is nothing left to do', () => {
		expect(reminderText(0, 0)).toBeNull();
	});

	it('names today and overdue tasks with right word forms', () => {
		expect(reminderText(1, 0)!.body).toBe('Не сделано: на сегодня 1 задача. Загляни в план.');
		expect(reminderText(3, 2)!.body).toBe('Не сделано: на сегодня 3 задачи, с прошлых дней 2. Загляни в план.');
		expect(reminderText(0, 5)!.body).toBe('Не сделано: с прошлых дней 5. Загляни в план.');
		expect(reminderText(11, 0)!.body).toContain('11 задач');
	});
});
