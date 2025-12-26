import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCookie, getCookie } from "@/lib/cookies";

const THEME_COOKIE_KEY = "app-theme";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  // Load theme from cookie on mount
  useEffect(() => {
    const savedTheme = getCookie(THEME_COOKIE_KEY);
    if (savedTheme && savedTheme !== theme) {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: string) => {
    // Create fade overlay for smooth transition
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    document.body.appendChild(overlay);
    
    // Add transitioning class
    document.documentElement.classList.add('transitioning');
    
    // Fade in the overlay
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      
      // Wait for fade in, then change theme
      setTimeout(() => {
        // Save to cookie (365 days expiry)
        setCookie(THEME_COOKIE_KEY, newTheme, 365);
        setTheme(newTheme);
        
        // Wait a bit for theme to apply, then fade out
        requestAnimationFrame(() => {
          overlay.classList.remove('active');
          
          // Remove overlay and transitioning class after fade out
          setTimeout(() => {
            document.documentElement.classList.remove('transitioning');
            overlay.remove();
          }, 300);
        });
      }, 200);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Terang</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Gelap</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <span className="mr-2">💻</span>
          <span>Sistem</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
