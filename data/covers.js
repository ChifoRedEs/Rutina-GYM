/* Rutina Gym — portadas de los ejercicios del catálogo.
 *
 * Cada número es el nombre del archivo de su portada en assets/exercises/img/:
 *   1 → assets/exercises/img/01.webp, 2 → 02.webp … 98 → 98.webp
 *
 * Para añadir una portada basta con subir el archivo con su número a esa carpeta.
 * La app comprueba al abrirse qué archivos existen y los muestra solos; los que
 * aún no existen simplemente no se muestran (nunca aparece una imagen rota).
 *
 * No cambies los números: coinciden con la lista «Ejercicios_Rutina-GYM_.pdf». */
window.GYM_DATA = window.GYM_DATA || {};
window.GYM_DATA.COVER_DIR = "assets/exercises/img/";
window.GYM_DATA.COVER_EXT = "webp";
window.GYM_DATA.COVERS = {
  /* Empuje · Pecho */
  "press-de-pecho-convergente-en-m-quina": 1, // 01 Press de pecho convergente en máquina
  "aperturas-pec-deck-en-m-quina": 2, // 02 Aperturas / Pec Deck en máquina
  "cruces-en-polea-alta": 3, // 03 Cruces en polea alta
  "press-de-banca-barra-libre-o-multipower-smith": 4, // 04 Press de banca (barra libre o Multipower/Smith)
  "press-inclinado-con-mancuernas": 5, // 05 Press inclinado con mancuernas
  "flexiones-de-pecho": 6, // 06 Flexiones de pecho
  /* Empuje · Hombro */
  "press-de-hombros-sentado-en-m-quina": 7, // 07 Press de hombros sentado en máquina
  "elevaciones-laterales-en-m-quina-o-polea-baja": 8, // 08 Elevaciones laterales en máquina o polea baja
  "press-militar-sentado-con-mancuernas": 9, // 09 Press militar sentado con mancuernas
  "press-militar-con-barra": 10, // 10 Press militar con barra
  "press-arnold-con-mancuernas": 11, // 11 Press Arnold con mancuernas
  "elevaciones-frontales-con-mancuernas-o-disco": 12, // 12 Elevaciones frontales con mancuernas o disco
  "elevaciones-laterales-con-mancuernas": 13, // 13 Elevaciones laterales con mancuernas
  /* Empuje · Tríceps */
  "extensi-n-de-tr-ceps-en-polea-alta-con-cuerda": 14, // 14 Extensión de tríceps en polea alta con cuerda
  "m-quina-de-fondos-para-tr-ceps-triceps-press": 15, // 15 Máquina de fondos para tríceps / Triceps Press
  "press-franc-s-con-barra-ez-o-mancuernas": 16, // 16 Press francés con barra EZ o mancuernas
  "extensi-n-de-tr-ceps-por-encima-de-la-cabeza-con-mancuerna": 17, // 17 Extensión de tríceps por encima de la cabeza con mancuerna
  "fondos-en-paralelas-dips": 18, // 18 Fondos en paralelas / Dips
  /* Tracción · Espalda */
  "jal-n-al-pecho-lat-pulldown": 19, // 19 Jalón al pecho / Lat Pulldown
  "remo-sentado-con-apoyo-en-el-pecho": 20, // 20 Remo sentado con apoyo en el pecho
  "remo-en-polea-baja-con-agarre-estrecho": 21, // 21 Remo en polea baja con agarre estrecho
  "pull-over-en-polea-alta": 22, // 22 Pull-over en polea alta
  "trac-jalon-agarre-neutro": 23, // 23 Jalón con agarre estrecho neutro
  "trac-jalon-unilateral-polea": 24, // 24 Jalón unilateral en polea
  "trac-remo-maquina-unilateral": 25, // 25 Remo en máquina unilateral (tipo Hammer)
  "remo-con-mancuerna-a-una-mano-apoyado-en-banco": 26, // 26 Remo con mancuerna a una mano apoyado en banco
  "remo-con-barra-barra-libre-o-multipower": 27, // 27 Remo con barra (barra libre o Multipower)
  "trac-remo-pendlay": 28, // 28 Remo Pendlay con barra
  "trac-remo-t": 29, // 29 Remo en T (barra T o landmine)
  "trac-remo-mancuernas-banco-inclinado": 30, // 30 Remo con mancuernas en banco inclinado
  "trac-pullover-mancuerna": 31, // 31 Pullover con mancuerna en banco
  "dominadas-o-dominadas-asistidas": 32, // 32 Dominadas o dominadas asistidas
  "trac-dominadas-agarre-neutro": 33, // 33 Dominadas con agarre neutro
  "trac-remo-invertido": 34, // 34 Remo invertido en barra o anillas
  /* Tracción · Trapecio */
  "trac-encogimientos-maquina": 35, // 35 Encogimientos en máquina o Multipower
  "trac-encogimientos-mancuernas": 36, // 36 Encogimientos con mancuernas
  "trac-encogimientos-barra": 37, // 37 Encogimientos con barra
  "trac-elevaciones-y-inclinado": 38, // 38 Elevaciones en Y en banco inclinado
  /* Tracción · Deltoides posterior */
  "p-jaros-en-m-quina-pec-deck-invertido": 39, // 39 Pájaros en máquina / Pec Deck invertido
  "trac-face-pull": 40, // 40 Face pull en polea con cuerda
  "trac-cruces-invertidos-polea": 41, // 41 Cruces invertidos en polea
  "trac-pajaros-mancuernas": 42, // 42 Pájaros con mancuernas inclinado
  "trac-aperturas-posteriores-banda": 43, // 43 Aperturas posteriores con banda elástica
  /* Tracción · Bíceps */
  "curl-de-b-ceps-en-m-quina-predicador": 44, // 44 Curl de bíceps en máquina predicador
  "curl-de-b-ceps-en-polea-baja-con-barra-recta": 45, // 45 Curl de bíceps en polea baja con barra recta
  "curl-de-b-ceps-con-barra": 46, // 46 Curl de bíceps con barra
  "curl-alterno-con-mancuernas": 47, // 47 Curl alterno con mancuernas
  "curl-martillo-con-mancuernas": 48, // 48 Curl martillo con mancuernas
  "dominadas-supinas-chin-ups": 49, // 49 Dominadas supinas / Chin-ups
  /* Pierna · Cuádriceps */
  "extensi-n-de-cu-driceps-sentado": 50, // 50 Extensión de cuádriceps sentado
  "prensa-de-piernas-leg-press": 51, // 51 Prensa de piernas / Leg Press
  "sentadilla-hack-o-sentadilla-en-multipower": 52, // 52 Sentadilla Hack o Sentadilla en Multipower
  "sentadilla-con-barra": 53, // 53 Sentadilla con barra
  "sentadilla-b-lgara-con-mancuernas": 54, // 54 Sentadilla búlgara con mancuernas
  "sentadilla-copa-goblet-squat-con-mancuerna-pesada": 55, // 55 Sentadilla copa / Goblet Squat con mancuerna pesada
  "zancadas-con-mancuernas": 56, // 56 Zancadas con mancuernas
  /* Pierna · Glúteo y cadena posterior */
  "peso-muerto-convencional-barra-libre-o-multipower": 57, // 57 Peso muerto convencional (barra libre o Multipower)
  "buenos-d-as-con-barra": 58, // 58 Buenos días con barra
  "peso-muerto-rumano-con-mancuernas-o-barra": 59, // 59 Peso muerto rumano con mancuernas o barra
  "puente-de-gl-teo-elevaci-n-de-cadera-con-barra": 60, // 60 Puente de glúteo / elevación de cadera con barra
  "hiperextensiones-en-silla-romana-a-45": 61, // 61 Hiperextensiones en silla romana a 45°
  /* Pierna · Femoral */
  "curl-femoral-sentado": 62, // 62 Curl femoral sentado
  "curl-femoral-tumbado": 63, // 63 Curl femoral tumbado
  "curl-femoral-deslizante-en-el-suelo-con-deslizadores": 64, // 64 Curl femoral deslizante en el suelo (con deslizadores)
  /* Pierna · Gemelos */
  "elevaci-n-de-talones-de-pie-en-m-quina": 65, // 65 Elevación de talones de pie en máquina
  "elevaci-n-de-talones-sentado-en-m-quina": 66, // 66 Elevación de talones sentado en máquina
  "elevaci-n-de-talones-en-la-prensa-de-piernas": 67, // 67 Elevación de talones en la prensa de piernas
  "elevaci-n-de-talones-de-pie-sosteniendo-mancuernas": 68, // 68 Elevación de talones de pie sosteniendo mancuernas
  "elevaci-n-de-talones-a-una-pierna-con-mancuerna": 69, // 69 Elevación de talones a una pierna con mancuerna
  "elevaci-n-de-talones-a-un-pie-en-escal-n": 70, // 70 Elevación de talones a un pie en escalón
  /* Pierna · Aductores / Abductores */
  "aductor-abductor-en-m-quina": 71, // 71 Aductor / Abductor en máquina
  /* Core · Abdomen */
  "rotaci-n-de-torso-en-m-quina": 72, // 72 Rotación de torso en máquina
  "core-crunch-en-polea": 73, // 73 Crunch abdominal en polea
  "core-crunch-en-maquina": 74, // 74 Crunch abdominal en máquina
  "crunch-con-disco-o-mancuerna-en-banco-declinado": 75, // 75 Crunch con disco o mancuerna en banco declinado
  "core-ab-wheel": 76, // 76 Rueda abdominal (Ab Wheel)
  "core-crunch-inverso": 77, // 77 Crunch inverso
  "core-elevacion-rodillas-colgado": 78, // 78 Elevación de rodillas colgado
  "core-elevacion-piernas-colgado": 79, // 79 Elevación de piernas colgado
  "core-plancha-frontal": 80, // 80 Plancha frontal
  "core-plancha-lateral": 81, // 81 Plancha lateral
  "core-hollow-body": 82, // 82 Hollow Body Hold
  "core-mountain-climber": 83, // 83 Mountain Climbers
  /* Core · Lumbar */
  "extensi-n-lumbar-en-m-quina-sentada": 84, // 84 Extensión lumbar en máquina sentada
  "core-back-extension": 85, // 85 Extensión lumbar en banco
  "core-superman": 86, // 86 Superman
  /* Core · Estabilidad */
  "core-pallof-press": 87, // 87 Pallof Press en polea
  "core-suitcase-carry": 88, // 88 Suitcase Carry
  "core-carry-frontal": 89, // 89 Front Rack Carry
  "core-dead-bug": 90, // 90 Dead Bug
  "core-bird-dog": 91, // 91 Bird Dog
  /* Core · Pelvis / suelo pélvico */
  "core-puente-gluteo": 92, // 92 Puente de glúteos
  "core-retroversion-pelvica": 93, // 93 Retroversión pélvica tumbado
  "core-kegel-lento": 94, // 94 Kegel: contracciones lentas
  "core-kegel-rapido": 95, // 95 Kegel: contracciones rápidas
  "core-kegel-escalonado": 96, // 96 Kegel: contracción escalonada
  "core-respiracion-diafragmatica-pelvica": 97, // 97 Respiración diafragmática y relajación pélvica
  "core-clamshell": 98 // 98 Clamshell
};
