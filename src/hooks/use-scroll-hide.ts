import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useUIStore } from '../store/ui.store';
import { useCallback, useRef } from 'react';

export function useScrollHide(threshold = 10) {
  const { setNavVisible, lastScrollY, setLastScrollY, isNavVisible } = useUIStore();
  
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    
    // Ignore small bounces at top/bottom
    if (currentOffset <= 0) {
      if (!isNavVisible) setNavVisible(true);
      return;
    }

    const diff = currentOffset - lastScrollY;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && isNavVisible) {
        // Scrolling down - hide
        setNavVisible(false);
      } else if (diff < 0 && !isNavVisible) {
        // Scrolling up - show
        setNavVisible(true);
      }
      setLastScrollY(currentOffset);
    }
  }, [isNavVisible, lastScrollY, setNavVisible, setLastScrollY, threshold]);

  return { handleScroll: onScroll };
}
