# Typy používateľov: 
1. Admin 
2. Školiteľ 
3. Účastník 

# Registrácia 
Ako administrátor sa môžem registrovať na základe e-mailovej pozvánky od iného dministrátora 
Ako školiteľ sa môžem registrovať na základe e-mailovej pozvánky od administrátora 
Ako účastník sa môžem registrovať na základe e-mailovej pozvánky od školiteľa alebo administrátora, pozvánka musí byť zároveň pozvánkou do kurzu. 
Ak mi príde pozvánka ale už som registrovaný pod inou rolou tak po prihlásení cez link dostanem oprávnenia novej roly. 
Ak mi púríde pozvánka na rovnakú rolu, pod ktorou som už registrovaný dostanem možnosť sa prihlásiť do môjho existujúceho účtu 
Pri novej registrácii musím zadať meno a prizvisko

# Prihlásenie: 
Ako používateľ mám možnosť prihlásiť sa pomocou e-mailu a hesla 

# Vytvorenie školenia: 
Ako Školiteľ mám možnosť vytvoriť nové školenie 
Musím vyplniť názov a popis školenia, dátum začiatku a konca školenia, zvolím si, či budú materiály školenia účastníkom dostupné aj po skončení kurzu. 
Pri vytvorení môžem rovno zadať e-maily používateľov, ktorý budú účastníkmi alebo ich môžem zadať neskôr
Pri vytvorení môžem rovno pozvať ďalších školiteľov zadaním e-mailov, alebo ich môžem pozvať neskôr  
Ak ako školiteľ vytvorím školenie budem automaticky nastavený ako hlavný školiteľ, neskôr to môžem zmeniť. 
Ak ako admin vytvorím nové školenie, ak som zároveň aj školiteľom budem nastavený ako hlavný školiteľ, ak školiteľom nie som, musím zvoliť školiteľa spomedzi školiteľov existujúcich v systéme 

# Účasť v kurze 
Ak mi ako školiteľovi príde pozvánka do nového kurzu od iného školiteľa pridá sa medzi moje kurzy a získam práva školiteľa daného kurzu. 
Ak mi ako účastníkovi príde pozvánka do nového kurzu, tento kurz sa pridá medzi moje kurzy, a získam práva účastníka daného kurzu. 

# Zobrazenie zoznamu kurzov 
Ako admin, vidím všetky kurzy vytvorené inými adminmi alebo školiteľmi. 
Ako školiteľ vidím všetky kurzy kde figurujem ako školiteľ. 
Ako účastník vidím všetky kurzy kde figurujem ako účastník. 
Ak mám prístup pod viacerými rolami zobrazí sa mi pre každú rolu jedna záložka so samostatným zoznamom mojich kurzov pre danú rolu 
V zozname kurzov vidím názov kurzu, hlavného školiteľa a počet účastníkov a dátum začiatku a konca 
V zozname mám možnosť prehľadávať podľa názvu kurzu 

# Zmazanie kurzu 
Ako Admin alebo školiteľ mám možnosť zo zoznamu kurzov zmazať kurzy, ktoré som vytvoril, ale iba ak ešte nepotvrdil účasť ani jeden účastník. 

# Detail kurzu - školiteľ/admin 
V detaile vidím všetky parametre kurzu a môžem ich editovať 
Do kurzu môžem nahrať lekcie z iného existujúceho kurzu, na ktorom figurujem ako školiteľ 
Do kurzu mám možnosť pridať novú lekciu 
Ku každej lekcii mám možnosť vytvoriť aj test 
Lekcie a testy kurzu sú zobrazené v zozname 
Účastníci kurzu sú zobrazení v zozname 
Ak nie som jediný školiteľ kurzu vidím aj zoznam školiteľov 
## Vytvorenie Lekcie, detail lekcie
Musím zadať názov lekcie. 
Musím si zvoliť, či je lekcia povinná alebo nie. Defaultne je povinná. 
Pre lekciu môžem nastaviť časový úsek, ktorý musí používateľ stráviť na každej stránke než môže prejsť na ďalšiu, Defaultne je to 30s. 
Lekciu môžem nahrať v podobe PDF alebo PPT súboru. 
// toto zatiaľ netreba budeme len nahrávať z PPT/PDF
Lekcia sa skladá zo stránok. 
Môžem pridávať ľubovoľný počet stránok. 
Stránka môže nadpis, text, obrázky, videá alebo zvukový záznam. 
Môžem meniť poradie stránok. 
### Vytvorenie testu 
Ku každej lekcii môžem vytvoriť test. 
K testu môžem zadať úvodný text, ktorý za zoprazí účastníkovi než test začne. 
Môžem zadať celkový čas, v ktorom musí účastník test stihnúť vyplniť. 
Ak vytváram tets k povinnej lekcii, môžem zadať minimálne percento úspešnosti. 
Môžem zvoliť, či sa otázky majú zoraďovať náhodne.
Môžem si zvoliť koľkokrát má účastník možnosť test opakovať ak ho nevyplní úspešne. 
Test môže mať ľubovoľný počet otázok. 
Každá otázka môže mať ľubovoľný počet možných odpovedí. Musím označiť, ktoré odpovede sú správne 
Pre každú otázku môžem vyplniť počet bodov ak ho nevyplním je automaticky 1
## Zoznam Lekcii 
V zozname lekcii vidím názov lekcie, či má test alebo nie a počet účastníkov kt. ju dokončili/plný počet účastníkov
Lekcie mám možnosť zmazať ak žiadny účastník ešte danú lekciu neukončil, pred úplným zmazaním sa zobrazí upozornenie 
## Zoznam účastníkov 
V zozname účastníkov vidím meno a priezvisko účastníka, e-mail a progres v kurze v percentách (aké precento lekcii a testov z celkového počtu spravil)
Ak účastník dokončil celý kurz (všetky povinné kurzy a testy) a splnil limit úspešného spravenia všetkých testov označí sa zelenou 
Ak účastník dokončil celý kurz (všetky povinné kurzy a testy) ale nesplnil limit úspešného spravenia všetkýh testov a zároveň má ešte možnosť opravných pokusov označí sa oranžovou 
Ak účastník dokončil celý kurz (všetky povinné kurzy a testy) ale nesplnil limit úspešného spravenia všetkýh testov a zároveň už nemá možnosť opravných pokusov označí sa červenou.  
Účastníka môžem z kurzu odobrať ak ešte 
## Zoznam školiteľov 
Zobrazí sa zoznam všetkých školiteľov kurzu - meno, priezvisko, e-mail 
Školiteľov mám možnosť pridávať a odoberať. Odoberať školiteľov môžem iba ak som hlavným školiteľom kurzu. 

# Detail kurzu - účastník 
V detaile vidím všetky detaily kurzu ale nemôžem ich editovať 
Vidím svoj progres v kurze aké celkové percento lekcii a testov som už spravil, aké percento povinných lekcií a testov som už spravil, aké percento testov som splnil úspešne, aké percento testov som nesplnil úspešne 
Lekcie a testy kurzu sú zobrazené v zozname 
## Zoznam Lekcii 
V zozname lekcii vidím názov lekcie, či má test alebo nie a a môj progres vrámci danej lekcie, ak má test tak aj progres v teste 
## Lekcia 
Lekcia sa mi zobrazí formou prezentácie po stránkach na každej stránke musím stráviť minimálne limit zadaný školiteľom aby som sa mohol posunúť na naseldujúcu. 
Na predošlé stránky sa môžem vracať kedykoľvek. 
po uplynutí časového limitu sa stránka označí ako splnená 
po ukončení lekcie, ak k nej existuje test dostanem možnosť spraviť ho hneď alebo neskôr. 
V lekcii ktorú som už úspešne ukončil sa môžem ľubovoľne pohybovať medzi stránkami. 
## Vyplnenie testu 
Každá otázka sa zobrazí smostatne, po potvrdení odpovede sa zobrazí ďalšia 
Pri každej otázke vidím ako mi plynie časový limit na vyplnenie testu ak školiteľ nejaký zadal. 
Ak vyprší limit skôr ako vyplním všetky otázky zrátajú sa mi bidy za otázky na ktoré som stihol správne odpovedať. 
Po ukončení testu alebo uplynutí časového limitu sa mi zobrazí výsledok testu - získaný počet bodov/plný počet bodov a percento. 
Ak nesplním požadované percento na prejdenie a mám ešte možnosť test opakovať, dostanem túto možnosť pri zobrazení výsledkov alebo tak môžem urobiť neskôr 
## Zoznam školiteľov 
Zobrazí sa zoznam všetkých školiteľov kurzu - meno, priezvisko, e-mail 
