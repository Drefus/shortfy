import { describe, expect, it } from 'vitest';
import { OTHER_BROWSER, parseUserAgent } from '../../../../src/domain/stats/user-agent.js';

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  operaWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/115.0.0.0',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1',
  chromeAndroidPhone:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsungAndroidPhone:
    'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  safariIpad:
    'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeAndroidTablet:
    'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  curl: 'curl/8.10.1',
};

describe('parseUserAgent', () => {
  describe('dispositivo', () => {
    it('deve identificar desktop Windows', () => {
      expect(parseUserAgent(UA.chromeWindows).device).toBe('desktop');
    });

    it('deve identificar desktop macOS', () => {
      expect(parseUserAgent(UA.safariMac).device).toBe('desktop');
    });

    it('deve identificar iPhone como mobile', () => {
      expect(parseUserAgent(UA.safariIphone).device).toBe('mobile');
    });

    it('deve identificar celular Android como mobile', () => {
      expect(parseUserAgent(UA.chromeAndroidPhone).device).toBe('mobile');
    });

    it('deve identificar iPad como tablet', () => {
      expect(parseUserAgent(UA.safariIpad).device).toBe('tablet');
    });

    it('deve identificar Android sem "Mobile" como tablet', () => {
      expect(parseUserAgent(UA.chromeAndroidTablet).device).toBe('tablet');
    });

    it('deve identificar Googlebot como bot', () => {
      expect(parseUserAgent(UA.googlebot).device).toBe('bot');
    });

    it('deve identificar curl como bot', () => {
      expect(parseUserAgent(UA.curl).device).toBe('bot');
    });

    it.each([undefined, null, '', '  '])('deve tratar User-Agent ausente (%j) como bot', (ua) => {
      expect(parseUserAgent(ua).device).toBe('bot');
    });
  });

  describe('navegador', () => {
    it('deve identificar Chrome', () => {
      expect(parseUserAgent(UA.chromeWindows).browser).toBe('Chrome');
    });

    it('deve identificar Chrome no iOS', () => {
      expect(parseUserAgent(UA.chromeIphone).browser).toBe('Chrome');
    });

    it('deve identificar Firefox', () => {
      expect(parseUserAgent(UA.firefoxLinux).browser).toBe('Firefox');
    });

    it('deve identificar Safari', () => {
      expect(parseUserAgent(UA.safariMac).browser).toBe('Safari');
    });

    it('deve identificar Edge mesmo com "Chrome" no User-Agent', () => {
      expect(parseUserAgent(UA.edgeWindows).browser).toBe('Edge');
    });

    it('deve identificar Opera mesmo com "Chrome" no User-Agent', () => {
      expect(parseUserAgent(UA.operaWindows).browser).toBe('Opera');
    });

    it('deve identificar Samsung Internet mesmo com "Chrome" no User-Agent', () => {
      expect(parseUserAgent(UA.samsungAndroidPhone).browser).toBe('Samsung Internet');
    });

    it('deve classificar navegador desconhecido como "Outro"', () => {
      expect(parseUserAgent(UA.curl).browser).toBe(OTHER_BROWSER);
    });
  });
});
