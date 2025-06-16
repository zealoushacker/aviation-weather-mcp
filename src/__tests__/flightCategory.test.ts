/**
 * Tests for flight category determination logic
 */

describe('Flight Category Logic', () => {
  
  function determineFlightCategory(ceiling?: number, visibility?: number): 'VFR' | 'MVFR' | 'IFR' | 'LIFR' {
    // LIFR: Ceiling < 500ft OR Visibility < 1SM
    if ((ceiling !== undefined && ceiling < 500) || (visibility !== undefined && visibility < 1)) {
      return 'LIFR';
    }
    
    // IFR: Ceiling < 1000ft OR Visibility < 3SM
    if ((ceiling !== undefined && ceiling < 1000) || (visibility !== undefined && visibility < 3)) {
      return 'IFR';
    }
    
    // MVFR: Ceiling < 3000ft OR Visibility < 5SM
    if ((ceiling !== undefined && ceiling < 3000) || (visibility !== undefined && visibility < 5)) {
      return 'MVFR';
    }
    
    // VFR: Everything else
    return 'VFR';
  }

  describe('VFR conditions', () => {
    it('should return VFR for high ceiling and good visibility', () => {
      expect(determineFlightCategory(5000, 10)).toBe('VFR');
    });

    it('should return VFR for unlimited ceiling and good visibility', () => {
      expect(determineFlightCategory(undefined, 10)).toBe('VFR');
    });

    it('should return VFR for ceiling exactly at 3000 and visibility at 5', () => {
      expect(determineFlightCategory(3000, 5)).toBe('VFR');
    });
  });

  describe('MVFR conditions', () => {
    it('should return MVFR for ceiling between 1000-2999 ft', () => {
      expect(determineFlightCategory(2500, 10)).toBe('MVFR');
      expect(determineFlightCategory(1500, 10)).toBe('MVFR');
      expect(determineFlightCategory(1000, 10)).toBe('MVFR');
    });

    it('should return MVFR for visibility between 3-4 SM', () => {
      expect(determineFlightCategory(5000, 4)).toBe('MVFR');
      expect(determineFlightCategory(5000, 3)).toBe('MVFR');
    });

    it('should return MVFR when either condition is met', () => {
      expect(determineFlightCategory(2000, 3)).toBe('MVFR');
    });
  });

  describe('IFR conditions', () => {
    it('should return IFR for ceiling between 500-999 ft', () => {
      expect(determineFlightCategory(800, 10)).toBe('IFR');
      expect(determineFlightCategory(500, 10)).toBe('IFR');
    });

    it('should return IFR for visibility between 1-2 SM', () => {
      expect(determineFlightCategory(5000, 2)).toBe('IFR');
      expect(determineFlightCategory(5000, 1)).toBe('IFR');
    });

    it('should return IFR when either condition is met', () => {
      expect(determineFlightCategory(800, 2)).toBe('IFR');
    });
  });

  describe('LIFR conditions', () => {
    it('should return LIFR for ceiling below 500 ft', () => {
      expect(determineFlightCategory(400, 10)).toBe('LIFR');
      expect(determineFlightCategory(200, 10)).toBe('LIFR');
    });

    it('should return LIFR for visibility below 1 SM', () => {
      expect(determineFlightCategory(5000, 0.5)).toBe('LIFR');
      expect(determineFlightCategory(5000, 0.25)).toBe('LIFR');
    });

    it('should return LIFR when either condition is met', () => {
      expect(determineFlightCategory(300, 0.5)).toBe('LIFR');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined values correctly', () => {
      expect(determineFlightCategory(undefined, undefined)).toBe('VFR');
      expect(determineFlightCategory(undefined, 10)).toBe('VFR');
      expect(determineFlightCategory(5000, undefined)).toBe('VFR');
    });

    it('should prioritize worst conditions', () => {
      // Ceiling in LIFR range, visibility in VFR range
      expect(determineFlightCategory(300, 10)).toBe('LIFR');
      
      // Ceiling in VFR range, visibility in LIFR range
      expect(determineFlightCategory(5000, 0.5)).toBe('LIFR');
      
      // Ceiling in IFR range, visibility in MVFR range
      expect(determineFlightCategory(800, 4)).toBe('IFR');
    });
  });
});