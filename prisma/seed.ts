import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  const pw = (plain: string) => bcrypt.hash(plain, 10)

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminPw = await pw("admin123")
  const admin = await prisma.user.upsert({
    where: { email: "admin@skolenie.local" },
    update: {},
    create: {
      email: "admin@skolenie.local",
      firstName: "Admin",
      lastName: "Školenie",
      passwordHash: adminPw,
      roles: { create: [{ role: "ADMIN" }, { role: "TRAINER" }] },
    },
  })
  console.log(`  admin:   ${admin.email} / admin123`)

  const trainerPw = await pw("trainer123")
  const trainer = await prisma.user.upsert({
    where: { email: "trainer@skolenie.local" },
    update: {},
    create: {
      email: "trainer@skolenie.local",
      firstName: "Karol",
      lastName: "Novotný",
      passwordHash: trainerPw,
      roles: { create: [{ role: "TRAINER" }] },
    },
  })
  console.log(`  trainer: ${trainer.email} / trainer123`)

  const p1Pw = await pw("heslo123")
  const p1 = await prisma.user.upsert({
    where: { email: "jan.novak@skolenie.local" },
    update: {},
    create: {
      email: "jan.novak@skolenie.local",
      firstName: "Ján",
      lastName: "Novák",
      passwordHash: p1Pw,
      roles: { create: [{ role: "PARTICIPANT" }] },
    },
  })
  console.log(`  part 1:  ${p1.email} / heslo123`)

  const p2Pw = await pw("heslo123")
  const p2 = await prisma.user.upsert({
    where: { email: "maria.kovac@skolenie.local" },
    update: {},
    create: {
      email: "maria.kovac@skolenie.local",
      firstName: "Mária",
      lastName: "Kováč",
      passwordHash: p2Pw,
      roles: { create: [{ role: "PARTICIPANT" }] },
    },
  })
  console.log(`  part 2:  ${p2.email} / heslo123`)

  const p3Pw = await pw("heslo123")
  const p3 = await prisma.user.upsert({
    where: { email: "peter.horvath@skolenie.local" },
    update: {},
    create: {
      email: "peter.horvath@skolenie.local",
      firstName: "Peter",
      lastName: "Horváth",
      passwordHash: p3Pw,
      roles: { create: [{ role: "PARTICIPANT" }] },
    },
  })
  console.log(`  part 3:  ${p3.email} / heslo123`)

  // ── Course 1 — Active: Goju-Ryu karate ────────────────────────────────────

  let course1 = await prisma.course.findFirst({
    where: { name: "Základy Goju-Ryu karate" },
  })

  if (!course1) {
    course1 = await prisma.course.create({
      data: {
        name: "Základy Goju-Ryu karate",
        description:
          "Úvod do tradičného okinawského bojového umenia Goju-Ryu. Kurz pokrýva históriu, filozofiu, základné techniky a katy.",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        materialsAfterEnd: true,
        createdById: admin.id,
        primaryTrainerId: admin.id,
        trainers: { create: [{ userId: admin.id }, { userId: trainer.id }] },
        participants: {
          create: [
            { userId: p1.id, confirmedAt: new Date("2026-05-20") },
            { userId: p2.id, confirmedAt: new Date("2026-05-22") },
            { userId: p3.id },
          ],
        },
      },
    })
    console.log(`\n  Course 1: ${course1.name}`)

    // Lesson 1 — História
    const l1 = await prisma.lesson.create({
      data: {
        courseId: course1.id,
        name: "História Goju-Ryu",
        mandatory: true,
        minPageTime: 5,
        order: 1,
        pages: {
          create: [
            {
              order: 1,
              title: "Pôvod Goju-Ryu",
              content: [
                {
                  type: "paragraph",
                  text: "Goju-Ryu je jedným z hlavných štýlov karate pochádzajúcich z ostrova Okinawa v Japonsku. Slovo Goju znamená 'tvrdý-mäkký' a odráža filozofiu štýlu, ktorý kombinuje tvrdé (go) a mäkké (ju) techniky.",
                },
              ],
            },
            {
              order: 2,
              title: "Zakladateľ štýlu",
              content: [
                {
                  type: "paragraph",
                  text: "Goju-Ryu formalizoval Chojun Miyagi (1888–1953). Študoval pod vedením Kanryo Higaonna, majstra Naha-te. Miyagi kombinoval domáce okinawské umenie s čínskymi bojovými umeniami a v roku 1930 pomenoval štýl Goju-Ryu.",
                },
              ],
            },
            {
              order: 3,
              title: "Filozofia štýlu",
              content: [
                {
                  type: "paragraph",
                  text: "Základným princípom je rovnováha medzi silou a poddajnosťou. Techniky striedajú pevné bloky a silné údery (go) s kruhovými, odklonivými pohybmi a mäkkými blokmi (ju). Dôraz sa kladie na dych, silu jadra tela a rozvíjanie ki.",
                },
              ],
            },
            {
              order: 4,
              title: "Rozšírenie do sveta",
              content: [
                {
                  type: "paragraph",
                  text: "Po druhej svetovej vojne sa Goju-Ryu rozšírilo z Okinawy do Japonska a neskôr do celého sveta. V roku 2009 bol Goju-Ryu zapísaný do Zoznamu nehmotného kultúrneho dedičstva Japonska.",
                },
              ],
            },
          ],
        },
      },
    })

    await prisma.test.create({
      data: {
        lessonId: l1.id,
        introText:
          "Otestujte si znalosti o histórii Goju-Ryu karate. Na úspešné absolvovanie potrebujete aspoň 60 %.",
        timeLimit: 10 * 60,
        minPassPercent: 60,
        maxRetries: 2,
        randomOrder: true,
        questions: {
          create: [
            {
              order: 1,
              text: "Čo znamená slovo 'Goju' v preklade?",
              points: 2,
              answers: {
                create: [
                  { text: "Tvrdý-mäkký", isCorrect: true },
                  { text: "Rýchly-pomalý", isCorrect: false },
                  { text: "Silný-flexibilný", isCorrect: false },
                  { text: "Vnútorný-vonkajší", isCorrect: false },
                ],
              },
            },
            {
              order: 2,
              text: "Kto je považovaný za zakladateľa štýlu Goju-Ryu?",
              points: 2,
              answers: {
                create: [
                  { text: "Chojun Miyagi", isCorrect: true },
                  { text: "Gichin Funakoshi", isCorrect: false },
                  { text: "Kanryo Higaonna", isCorrect: false },
                  { text: "Masutatsu Oyama", isCorrect: false },
                ],
              },
            },
            {
              order: 3,
              text: "Z ktorého ostrova Goju-Ryu pochádza?",
              points: 1,
              answers: {
                create: [
                  { text: "Okinawa", isCorrect: true },
                  { text: "Hokkaidó", isCorrect: false },
                  { text: "Kjúšú", isCorrect: false },
                  { text: "Šikoku", isCorrect: false },
                ],
              },
            },
            {
              order: 4,
              text: "V ktorom roku bol Goju-Ryu zapísaný do Zoznamu nehmotného kultúrneho dedičstva Japonska?",
              points: 1,
              answers: {
                create: [
                  { text: "2009", isCorrect: true },
                  { text: "1999", isCorrect: false },
                  { text: "2015", isCorrect: false },
                  { text: "1985", isCorrect: false },
                ],
              },
            },
            {
              order: 5,
              text: "Ktoré dve tradície sa kombinujú v Goju-Ryu?",
              points: 2,
              answers: {
                create: [
                  { text: "Okinawské bojové umenie", isCorrect: true },
                  { text: "Čínske bojové umenie", isCorrect: true },
                  { text: "Japonské Judo", isCorrect: false },
                  { text: "Kórejské Taekwondo", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    })

    // Lesson 2 — Základné katy
    const l2 = await prisma.lesson.create({
      data: {
        courseId: course1.id,
        name: "Základné katy",
        mandatory: true,
        minPageTime: 5,
        order: 2,
        pages: {
          create: [
            {
              order: 1,
              title: "Čo je kata?",
              content: [
                {
                  type: "paragraph",
                  text: "Kata (型) je séria kodifikovaných pohybov, ktoré simulujú boj proti imaginárnym súperom. Kata slúži ako živá encyklopédia techník, rozvíja správne telo, dýchanie a ducha. V Goju-Ryu existuje 12 hlavných kát.",
                },
              ],
            },
            {
              order: 2,
              title: "Taikyoku Gedan — prvá kata",
              content: [
                {
                  type: "paragraph",
                  text: "Taikyoku Gedan je určená absolútnym začiatočníkom. Obsahuje základné kroky v postoji zenkutsu-dachi (predný postoj) s blokom gedan-barai (dolný blok) a úderom oi-tsuki (priamy úder). Pohyby tvoria tvar písmena H.",
                },
              ],
            },
            {
              order: 3,
              title: "Gekisai Dai Ichi",
              content: [
                {
                  type: "paragraph",
                  text: "Gekisai Dai Ichi vytvoril Chojun Miyagi v roku 1940 ako cvičebnú katu pre školy. Je dynamickejšia ako Taikyoku a obsahuje techniky blokovania, úderov aj kopov. Slovo 'gekisai' znamená 'zaútočiť a zničiť'.",
                },
              ],
            },
          ],
        },
      },
    })

    await prisma.test.create({
      data: {
        lessonId: l2.id,
        introText: "Otázky o základných katách Goju-Ryu.",
        timeLimit: 8 * 60,
        minPassPercent: 70,
        maxRetries: 1,
        randomOrder: false,
        questions: {
          create: [
            {
              order: 1,
              text: "Čo je kata v karate?",
              points: 2,
              answers: {
                create: [
                  {
                    text: "Séria kodifikovaných pohybov simulujúcich boj",
                    isCorrect: true,
                  },
                  { text: "Súťažný zápas dvoch bojovníkov", isCorrect: false },
                  { text: "Pozdrav pred tréningom", isCorrect: false },
                  { text: "Druh ochrannej výstroje", isCorrect: false },
                ],
              },
            },
            {
              order: 2,
              text: "Koľko hlavných kát existuje v Goju-Ryu?",
              points: 1,
              answers: {
                create: [
                  { text: "12", isCorrect: true },
                  { text: "8", isCorrect: false },
                  { text: "15", isCorrect: false },
                  { text: "20", isCorrect: false },
                ],
              },
            },
            {
              order: 3,
              text: "Kto a kedy vytvoril katu Gekisai Dai Ichi?",
              points: 2,
              answers: {
                create: [
                  {
                    text: "Chojun Miyagi v roku 1940",
                    isCorrect: true,
                  },
                  {
                    text: "Kanryo Higaonna v roku 1910",
                    isCorrect: false,
                  },
                  {
                    text: "Gichin Funakoshi v roku 1922",
                    isCorrect: false,
                  },
                  {
                    text: "Chojun Miyagi v roku 1920",
                    isCorrect: false,
                  },
                ],
              },
            },
          ],
        },
      },
    })

    // Lesson 3 — optional
    await prisma.lesson.create({
      data: {
        courseId: course1.id,
        name: "Výbava a etiketa dojo",
        mandatory: false,
        minPageTime: 5,
        order: 3,
        pages: {
          create: [
            {
              order: 1,
              title: "Karategi — cvičebný úbor",
              content: [
                {
                  type: "paragraph",
                  text: "Karategi (空手着) je tradičný cvičebný úbor tvorený bielou bundou (uwagi), nohavicami (zubon) a pásom (obi). V Goju-Ryu sa nosí biely karategi. Farba pásu označuje úroveň cvičenca: biely (začiatočník), žltý, oranžový, zelený, modrý, hnedý a čierny (dan).",
                },
              ],
            },
            {
              order: 2,
              title: "Pravidlá dojo",
              content: [
                {
                  type: "paragraph",
                  text: "Dojo (道場) je miesto kde sa cvičí. Základné pravidlá: pokloniť sa pri vstupe a odchode, oslovovať inštruktora 'Sensei', prichádzať načas, mať čistý a upravený karategi, vypnúť mobily, odložiť šperky. Dojo je miesto rešpektu a sústredenia.",
                },
              ],
            },
          ],
        },
      },
    })

    console.log("    → 3 lekcie, 2 testy")
  }

  // ── Course 2 — Upcoming: Bezpečnosť pri práci ────────────────────────────

  let course2 = await prisma.course.findFirst({
    where: { name: "Bezpečnosť a ochrana zdravia pri práci" },
  })

  if (!course2) {
    course2 = await prisma.course.create({
      data: {
        name: "Bezpečnosť a ochrana zdravia pri práci",
        description:
          "Povinné školenie BOZP pre zamestnancov. Pokrýva legislatívu, identifikáciu rizík, osobné ochranné prostriedky a postup pri pracovnom úraze.",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-08-31"),
        materialsAfterEnd: false,
        createdById: trainer.id,
        primaryTrainerId: trainer.id,
        trainers: { create: [{ userId: trainer.id }] },
        participants: {
          create: [
            { userId: p1.id, confirmedAt: new Date("2026-07-10") },
            { userId: p3.id, confirmedAt: new Date("2026-07-15") },
          ],
        },
      },
    })
    console.log(`\n  Course 2: ${course2.name}`)

    const l3 = await prisma.lesson.create({
      data: {
        courseId: course2.id,
        name: "Legislatívny rámec BOZP",
        mandatory: true,
        minPageTime: 10,
        order: 1,
        pages: {
          create: [
            {
              order: 1,
              title: "Zákon o BOZP č. 124/2006 Z. z.",
              content: [
                {
                  type: "paragraph",
                  text: "Zákon č. 124/2006 Z. z. o bezpečnosti a ochrane zdravia pri práci ukladá zamestnávateľovi povinnosť zabezpečiť bezpečné pracovné podmienky. Zamestnávateľ musí vykonávať pravidelné školenia BOZP, viesť dokumentáciu a odstranovať zistené nedostatky.",
                },
              ],
            },
            {
              order: 2,
              title: "Povinnosti zamestnanca",
              content: [
                {
                  type: "paragraph",
                  text: "Zamestnanec je povinný: dodržiavať bezpečnostné predpisy, používať pridelené osobné ochranné prostriedky (OOP), zúčastňovať sa školení BOZP, nekonzumovať alkohol na pracovisku, hlásiť úrazy a nebezpečné situácie nadriadeným.",
                },
              ],
            },
            {
              order: 3,
              title: "Pracovný úraz — postup",
              content: [
                {
                  type: "paragraph",
                  text: "Pri pracovnom úraze: 1) Poskytnúť prvú pomoc, 2) Privolať záchranku ak je potrebné (155), 3) Zabezpečiť miesto úrazu (nezasahovať do stôp), 4) Okamžite informovať nadriadeného, 5) Spísať záznam o pracovnom úraze do 4 dní.",
                },
              ],
            },
          ],
        },
      },
    })

    await prisma.test.create({
      data: {
        lessonId: l3.id,
        introText: "Záverečný test zo základov BOZP legislatívy. Potrebujete 70 % na úspešné absolvovanie.",
        timeLimit: 15 * 60,
        minPassPercent: 70,
        maxRetries: 2,
        randomOrder: true,
        questions: {
          create: [
            {
              order: 1,
              text: "Ktorý zákon upravuje bezpečnosť a ochranu zdravia pri práci na Slovensku?",
              points: 2,
              answers: {
                create: [
                  { text: "Zákon č. 124/2006 Z. z.", isCorrect: true },
                  { text: "Zákon č. 311/2001 Z. z.", isCorrect: false },
                  { text: "Zákon č. 460/1992 Zb.", isCorrect: false },
                  { text: "Zákon č. 595/2003 Z. z.", isCorrect: false },
                ],
              },
            },
            {
              order: 2,
              text: "Do kolkých dní je potrebné spísať záznam o pracovnom úraze?",
              points: 2,
              answers: {
                create: [
                  { text: "4 dni", isCorrect: true },
                  { text: "1 deň", isCorrect: false },
                  { text: "7 dní", isCorrect: false },
                  { text: "30 dní", isCorrect: false },
                ],
              },
            },
            {
              order: 3,
              text: "Čo je povinný zamestnanec vykonať v prípade pracovného úrazu kolegу? (vyber všetky správne)",
              points: 3,
              answers: {
                create: [
                  { text: "Poskytnúť prvú pomoc", isCorrect: true },
                  { text: "Informovať nadriadeného", isCorrect: true },
                  { text: "Nezasahovať do miesta úrazu", isCorrect: true },
                  { text: "Opustiť pracovisko", isCorrect: false },
                ],
              },
            },
            {
              order: 4,
              text: "Aká je skratka pre 'osobné ochranné prostriedky'?",
              points: 1,
              answers: {
                create: [
                  { text: "OOP", isCorrect: true },
                  { text: "BOZP", isCorrect: false },
                  { text: "PPE", isCorrect: false },
                  { text: "OOS", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    })

    await prisma.lesson.create({
      data: {
        courseId: course2.id,
        name: "Osobné ochranné prostriedky",
        mandatory: true,
        minPageTime: 10,
        order: 2,
        pages: {
          create: [
            {
              order: 1,
              title: "Kategórie OOP",
              content: [
                {
                  type: "paragraph",
                  text: "OOP delíme do troch kategórií podla úrovne rizika. Kategória I: jednoduché OOP pre minimálne riziká (napr. záhradné rukavice). Kategória II: štandardné OOP (napr. helmy, ochranné okuliare). Kategória III: OOP pre smrtelné alebo nezvratné riziká (napr. dýchacie prístroje, záchranné vesty).",
                },
              ],
            },
            {
              order: 2,
              title: "Správne používanie OOP",
              content: [
                {
                  type: "paragraph",
                  text: "OOP musí byť: certifikované (označenie CE), vhodné pre konkrétne riziko, pravidelne kontrolované a udržiavané, vymenované pri poškodení. Zamestnanec je povinný OOP skutočne používať, nielen mať k dispozícii.",
                },
              ],
            },
          ],
        },
      },
    })
    console.log("    → 2 lekcie, 1 test")
  }

  // ── Course 3 — Finished: Prvá pomoc ──────────────────────────────────────

  let course3 = await prisma.course.findFirst({
    where: { name: "Základy prvej pomoci" },
  })

  if (!course3) {
    course3 = await prisma.course.create({
      data: {
        name: "Základy prvej pomoci",
        description:
          "Praktický kurz základov prvej pomoci. Naučíte sa rozpoznať ohrozenie života, poskytnúť základnú pomoc a privolať záchranárov.",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-31"),
        materialsAfterEnd: true,
        createdById: admin.id,
        primaryTrainerId: admin.id,
        trainers: { create: [{ userId: admin.id }] },
        participants: {
          create: [
            { userId: p2.id, confirmedAt: new Date("2026-02-15") },
            { userId: p3.id, confirmedAt: new Date("2026-02-18") },
          ],
        },
      },
    })
    console.log(`\n  Course 3: ${course3.name}`)

    const l4 = await prisma.lesson.create({
      data: {
        courseId: course3.id,
        name: "Rozpoznanie ohrozenia života",
        mandatory: true,
        minPageTime: 5,
        order: 1,
        pages: {
          create: [
            {
              order: 1,
              title: "Kontrola vedomia a dýchania",
              content: [
                {
                  type: "paragraph",
                  text: "Prvý krok pri nájdení osoby: 1) Uistite sa, že ste v bezpečí, 2) Oslovte postihnutého: 'Počujete ma?', 3) Zatrastte ramenom, 4) Kontrolujte dýchanie max. 10 sekúnd — viditeľné pohyby hrudníka, cítiteľný prúd vzduchu.",
                },
              ],
            },
            {
              order: 2,
              title: "Volanie záchranky",
              content: [
                {
                  type: "paragraph",
                  text: "Záchranná služba SR: číslo 155 alebo európske tiesňové číslo 112. Pri hovore oznámte: kde sa nachádzate (adresa, orientačné body), čo sa stalo, koľko postihnutých je, aký je ich stav, vaše meno a telefónne číslo. Nechajte operátora, aby ukončil hovor.",
                },
              ],
            },
            {
              order: 3,
              title: "Stabilizovaná poloha",
              content: [
                {
                  type: "paragraph",
                  text: "Stabilizovaná (zotavovacia) poloha sa používa u osoby bez vedomia, ktorá dýcha. Otočte postihnutého na bok, spodnú ruku natiahnite, vrchnú ruku a koleno oprite o zem. Tým zabránite uduseniu jazykom alebo zvratkami. Pravidelne kontrolujte dýchanie.",
                },
              ],
            },
          ],
        },
      },
    })

    await prisma.test.create({
      data: {
        lessonId: l4.id,
        introText:
          "Test z rozpoznania ohrozenia života. Správne odpovede môžu zachraniť život. Potrebujete 80 %.",
        timeLimit: 10 * 60,
        minPassPercent: 80,
        maxRetries: 1,
        randomOrder: false,
        questions: {
          create: [
            {
              order: 1,
              text: "Aké číslo záchrannej služby voláme na Slovensku?",
              points: 2,
              answers: {
                create: [
                  { text: "155", isCorrect: true },
                  { text: "150", isCorrect: false },
                  { text: "158", isCorrect: false },
                  { text: "112", isCorrect: false },
                ],
              },
            },
            {
              order: 2,
              text: "Ako dlho maximálne kontrolujeme dýchanie postihnutého?",
              points: 2,
              answers: {
                create: [
                  { text: "10 sekúnd", isCorrect: true },
                  { text: "30 sekúnd", isCorrect: false },
                  { text: "5 sekúnd", isCorrect: false },
                  { text: "1 minútu", isCorrect: false },
                ],
              },
            },
            {
              order: 3,
              text: "Kedy použijeme stabilizovanú (zotavovaciu) polohu?",
              points: 2,
              answers: {
                create: [
                  {
                    text: "Keď je postihnutý bez vedomia a dýcha",
                    isCorrect: true,
                  },
                  {
                    text: "Keď je postihnutý pri vedomí a dýcha",
                    isCorrect: false,
                  },
                  {
                    text: "Keď postihnutý nedýcha",
                    isCorrect: false,
                  },
                  {
                    text: "Vždy pri páde z výšky",
                    isCorrect: false,
                  },
                ],
              },
            },
            {
              order: 4,
              text: "Aké informácie oznámime operátorovi záchranky? (vyber všetky)",
              points: 3,
              answers: {
                create: [
                  { text: "Kde sa nachádzame", isCorrect: true },
                  { text: "Čo sa stalo", isCorrect: true },
                  { text: "Počet postihnutých", isCorrect: true },
                  { text: "Číslo zdravotnej poisťovne", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    })

    const l5 = await prisma.lesson.create({
      data: {
        courseId: course3.id,
        name: "Resuscitácia — KPR",
        mandatory: true,
        minPageTime: 5,
        order: 2,
        pages: {
          create: [
            {
              order: 1,
              title: "Kedy začíname KPR?",
              content: [
                {
                  type: "paragraph",
                  text: "Kardiopulmonálna resuscitácia (KPR) sa začína, keď postihnutý: nemá vedomie A súčasne nedýcha alebo dýcha nenormálne (lapavé dychy). Pred začatím zavolajte 155 alebo požiadajte niekoho iného, aby zavolal, kým vy začnete KPR.",
                },
              ],
            },
            {
              order: 2,
              title: "Technika stlačovania hrudníka",
              content: [
                {
                  type: "paragraph",
                  text: "Položte pätu dlane na stred hrudníka (dolná tretina hrudnej kosti). Druhou rukou prekryte prvú, prsty preplette. Stlačujte do hĺbky 5–6 cm, frekvenciou 100–120 stlačení/min. Ramená musia byť kolmo nad hrudníkom. Medzi stlačeniami hrudník úplne uvoľnite.",
                },
              ],
            },
            {
              order: 3,
              title: "Pomer stlačení a vdychov",
              content: [
                {
                  type: "paragraph",
                  text: "Štandardná KPR: 30 stlačení : 2 záchranné vdychy. Záchranný vdych: zatlačte hlavu dozadu, zdvihnite bradu, zapchajte nos, vdýchnite do úst cca 1 sekundu, sledujte zdvíhanie hrudníka. Ak neviete alebo nechcete robiť vdychy, robte len stlačenia (tzv. hands-only KPR).",
                },
              ],
            },
          ],
        },
      },
    })

    await prisma.test.create({
      data: {
        lessonId: l5.id,
        introText: "Test z techniky kardiopulmonálnej resuscitácie. Vyžaduje sa 80 %.",
        timeLimit: 10 * 60,
        minPassPercent: 80,
        maxRetries: 0,
        randomOrder: false,
        questions: {
          create: [
            {
              order: 1,
              text: "Aký je správny pomer stlačení hrudníka a záchranných vdychov?",
              points: 2,
              answers: {
                create: [
                  { text: "30 : 2", isCorrect: true },
                  { text: "15 : 2", isCorrect: false },
                  { text: "30 : 1", isCorrect: false },
                  { text: "10 : 2", isCorrect: false },
                ],
              },
            },
            {
              order: 2,
              text: "Do akej hĺbky stlačujeme hrudník dospelého pri KPR?",
              points: 2,
              answers: {
                create: [
                  { text: "5–6 cm", isCorrect: true },
                  { text: "2–3 cm", isCorrect: false },
                  { text: "8–10 cm", isCorrect: false },
                  { text: "1–2 cm", isCorrect: false },
                ],
              },
            },
            {
              order: 3,
              text: "Aká je odporúčaná frekvencia stlačení hrudníka?",
              points: 2,
              answers: {
                create: [
                  { text: "100–120 stlačení/min", isCorrect: true },
                  { text: "60–80 stlačení/min", isCorrect: false },
                  { text: "150–180 stlačení/min", isCorrect: false },
                  { text: "50–60 stlačení/min", isCorrect: false },
                ],
              },
            },
            {
              order: 4,
              text: "Kde prikladáme ruky pri stlačovaní hrudníka?",
              points: 1,
              answers: {
                create: [
                  { text: "Na stred hrudníka — dolná tretina hrudnej kosti", isCorrect: true },
                  { text: "Na ľavú stranu hrudníka nad srdcom", isCorrect: false },
                  { text: "Na hornú tretinu hrudnej kosti", isCorrect: false },
                  { text: "Na brucho pod hrudnou kosťou", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
    })

    console.log("    → 2 lekcie, 2 testy")
  }

  // ── Progress: Course 1 (Goju-Ryu, active) ─────────────────────────────────
  // Only seed if no progress exists yet (idempotent re-runs).
  const c1ProgressCount = await prisma.lessonProgress.count({ where: { lesson: { courseId: course1.id } } })

  if (c1ProgressCount === 0) {
    const c1Lessons = await prisma.lesson.findMany({
      where: { courseId: course1.id },
      orderBy: { order: "asc" },
      include: {
        pages: { orderBy: { order: "asc" } },
        test: {
          include: { questions: { orderBy: { order: "asc" }, include: { answers: true } } },
        },
      },
    })
    const [historia, katy] = c1Lessons // lesson 3 (Výbava) has no test, skip

    // Ján Novák — completed lesson 1 + passed test; lesson 2 in progress (2/3 pages)
    for (const pg of historia.pages) {
      await prisma.lessonPageProgress.create({
        data: { userId: p1.id, pageId: pg.id, timeSpent: 120 + pg.order * 15, completedAt: new Date("2026-06-05") },
      })
    }
    await prisma.lessonProgress.create({ data: { userId: p1.id, lessonId: historia.id, completedAt: new Date("2026-06-05") } })
    if (historia.test) {
      // Score 6/8 (75% ≥ 60% → pass): Q1–Q4 all correct, Q5 skipped (multi-select, 0 pts)
      const attempt = await prisma.testAttempt.create({
        data: { userId: p1.id, testId: historia.test.id, startedAt: new Date("2026-06-05T10:00:00Z"), finishedAt: new Date("2026-06-05T10:07:00Z"), score: 6, maxScore: 8, passed: true },
      })
      for (const q of historia.test.questions) {
        const correct = q.answers.filter((a) => a.isCorrect).map((a) => a.id)
        // Q5 has 2 correct answers (order 5); p1 skips it → 0 pts
        await prisma.questionResponse.create({
          data: { attemptId: attempt.id, questionId: q.id, selectedIds: q.order === 5 ? [] : correct },
        })
      }
    }
    for (const pg of katy.pages.slice(0, 2)) {
      await prisma.lessonPageProgress.create({
        data: { userId: p1.id, pageId: pg.id, timeSpent: 180, completedAt: new Date("2026-06-10") },
      })
    }

    // Mária Kováč — completed lesson 1; test failed twice (1 retry left out of 2)
    for (const pg of historia.pages) {
      await prisma.lessonPageProgress.create({
        data: { userId: p2.id, pageId: pg.id, timeSpent: 90 + pg.order * 20, completedAt: new Date("2026-06-03") },
      })
    }
    await prisma.lessonProgress.create({ data: { userId: p2.id, lessonId: historia.id, completedAt: new Date("2026-06-03") } })
    if (historia.test) {
      // Attempt 1 — score 3/8 (37.5% < 60%): Q2 Miyagi(2pt) + Q3 Okinawa(1pt)
      const a1 = await prisma.testAttempt.create({
        data: { userId: p2.id, testId: historia.test.id, startedAt: new Date("2026-06-03T14:00:00Z"), finishedAt: new Date("2026-06-03T14:08:00Z"), score: 3, maxScore: 8, passed: false },
      })
      for (const q of historia.test.questions) {
        const correct = q.answers.filter((a) => a.isCorrect).map((a) => a.id)
        const wrong = q.answers.filter((a) => !a.isCorrect).map((a) => a.id)
        await prisma.questionResponse.create({
          data: { attemptId: a1.id, questionId: q.id, selectedIds: q.order === 2 || q.order === 3 ? correct.slice(0, 1) : wrong.slice(0, 1) },
        })
      }
      // Attempt 2 — score 4/8 (50% < 60%): additionally gets Q4 "2009"(1pt)
      const a2 = await prisma.testAttempt.create({
        data: { userId: p2.id, testId: historia.test.id, startedAt: new Date("2026-06-07T09:00:00Z"), finishedAt: new Date("2026-06-07T09:09:00Z"), score: 4, maxScore: 8, passed: false },
      })
      for (const q of historia.test.questions) {
        const correct = q.answers.filter((a) => a.isCorrect).map((a) => a.id)
        const wrong = q.answers.filter((a) => !a.isCorrect).map((a) => a.id)
        await prisma.questionResponse.create({
          data: { attemptId: a2.id, questionId: q.id, selectedIds: q.order === 2 || q.order === 3 || q.order === 4 ? correct.slice(0, 1) : wrong.slice(0, 1) },
        })
      }
    }

    // Peter Horváth — not confirmed, no progress

    console.log("    → Progress seeded: course 1")
  }

  // ── Progress: Course 3 (Prvá pomoc, finished) ──────────────────────────────
  const c3ProgressCount = await prisma.lessonProgress.count({ where: { lesson: { courseId: course3.id } } })

  if (c3ProgressCount === 0) {
    const c3Lessons = await prisma.lesson.findMany({
      where: { courseId: course3.id },
      orderBy: { order: "asc" },
      include: {
        pages: { orderBy: { order: "asc" } },
        test: {
          include: { questions: { orderBy: { order: "asc" }, include: { answers: true } } },
        },
      },
    })
    const [ohrozenie, kpr] = c3Lessons

    // Mária Kováč — completed both lessons, passed both tests (100% → green)
    for (const lesson of c3Lessons) {
      for (const pg of lesson.pages) {
        await prisma.lessonPageProgress.create({
          data: { userId: p2.id, pageId: pg.id, timeSpent: 200 + pg.order * 10, completedAt: new Date("2026-03-10") },
        })
      }
      await prisma.lessonProgress.create({ data: { userId: p2.id, lessonId: lesson.id, completedAt: new Date("2026-03-10") } })
      if (lesson.test) {
        const maxS = lesson.test.questions.reduce((s, q) => s + q.points, 0)
        const attempt = await prisma.testAttempt.create({
          data: { userId: p2.id, testId: lesson.test.id, startedAt: new Date("2026-03-10T11:00:00Z"), finishedAt: new Date("2026-03-10T11:10:00Z"), score: maxS, maxScore: maxS, passed: true },
        })
        for (const q of lesson.test.questions) {
          await prisma.questionResponse.create({
            data: { attemptId: attempt.id, questionId: q.id, selectedIds: q.answers.filter((a) => a.isCorrect).map((a) => a.id) },
          })
        }
      }
    }

    // Peter Horváth — completed lesson 1 + passed test; lesson 2 first 2/3 pages only
    for (const pg of ohrozenie.pages) {
      await prisma.lessonPageProgress.create({
        data: { userId: p3.id, pageId: pg.id, timeSpent: 180 + pg.order * 12, completedAt: new Date("2026-03-12") },
      })
    }
    await prisma.lessonProgress.create({ data: { userId: p3.id, lessonId: ohrozenie.id, completedAt: new Date("2026-03-12") } })
    if (ohrozenie.test) {
      const maxS = ohrozenie.test.questions.reduce((s, q) => s + q.points, 0)
      const attempt = await prisma.testAttempt.create({
        data: { userId: p3.id, testId: ohrozenie.test.id, startedAt: new Date("2026-03-12T14:00:00Z"), finishedAt: new Date("2026-03-12T14:08:00Z"), score: maxS, maxScore: maxS, passed: true },
      })
      for (const q of ohrozenie.test.questions) {
        await prisma.questionResponse.create({
          data: { attemptId: attempt.id, questionId: q.id, selectedIds: q.answers.filter((a) => a.isCorrect).map((a) => a.id) },
        })
      }
    }
    for (const pg of kpr.pages.slice(0, 2)) {
      await prisma.lessonPageProgress.create({
        data: { userId: p3.id, pageId: pg.id, timeSpent: 220, completedAt: new Date("2026-03-15") },
      })
    }

    console.log("    → Progress seeded: course 3")
  }

  console.log("\n✅ Seed dokončený!\n")
  console.log("Účty:")
  console.log("  admin@skolenie.local       / admin123   (Admin + Školiteľ)")
  console.log("  trainer@skolenie.local     / trainer123 (Školiteľ)")
  console.log("  jan.novak@skolenie.local   / heslo123   (Účastník)")
  console.log("  maria.kovac@skolenie.local / heslo123   (Účastník)")
  console.log("  peter.horvath@skolenie.local / heslo123 (Účastník)\n")
  console.log("Kurzy:")
  console.log("  1. Základy Goju-Ryu karate           — PREBIEHAJÚCI (jún–aug 2026)")
  console.log("  2. Bezpečnosť a ochrana zdravia...   — PLÁNOVANÝ    (aug 2026)")
  console.log("  3. Základy prvej pomoci              — UKONČENÝ     (mar 2026)")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
