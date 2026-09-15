import {
  AlarmClock,
  BedDouble,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Circle,
  Dumbbell,
  Film,
  Footprints,
  Gamepad2,
  GraduationCap,
  Heart,
  Laptop,
  Leaf,
  Mail,
  MessageCircle,
  Moon,
  Palette,
  PenLine,
  PersonStanding,
  PhoneCall,
  Presentation,
  Sun,
  Users,
} from '@lucide/vue'
import type { Component } from 'vue'

// Реестр иконок для тегов сфер. Расширять по мере добавления новых
// дефолтных/пользовательских иконок — держим импорт явным, а не
// `import *`, чтобы бандл не тянул весь набор Lucide целиком.
export const ICONS: Record<string, Component> = {
  AlarmClock,
  BedDouble,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Dumbbell,
  Film,
  Footprints,
  Gamepad2,
  GraduationCap,
  Heart,
  Laptop,
  Leaf,
  Mail,
  MessageCircle,
  Moon,
  Palette,
  PenLine,
  PersonStanding,
  PhoneCall,
  Presentation,
  Sun,
  Users,
}

export function resolveIcon(name: string): Component {
  return ICONS[name] ?? Circle
}
