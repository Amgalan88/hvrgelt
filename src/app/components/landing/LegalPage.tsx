import { ChevronLeft, FileText, Lock, Truck, Phone } from "lucide-react";
import { PHONES, WORK_HOURS, CITY, SOCIAL, SITE } from "../../lib/contact";
import type { LegalKey } from "./Landing";

const PHONE_LIST = PHONES.map((p) => p.label).join(", ");
const short = (url: string) => url.replace("https://www.", "");

const PAGES = {
  terms: {
    title: "Үйлчилгээний нөхцөл",
    icon: FileText,
    content: [
      { heading: "1. Ерөнхий заалт", body: "hvrgelt.mn нь Дархан хотод үйл ажиллагаа явуулдаг хүргэлтийн үйлчилгээ юм. Платформыг ашигласнаар та доорх нөхцөлийг зөвшөөрсөнд тооцогдоно." },
      { heading: "2. Үйлчилгээний тайлбар", body: "Бид хэрэглэгчийн захиалгыг хүлээн авч, хүргэгчээр дамжуулан тогтоосон хаягт хүргэх үйлчилгээ үзүүлнэ. Захиалгын үнийг оператор тогтооно." },
      { heading: "3. Хариуцлага", body: "Хүргэлтийн явцад эвдэрч гэмтсэн болон алдагдсан эд зүйлийн хариуцлагыг hvrgelt.mn хүлээнэ. Ачааг хүлээн авахдаа заавал шалгана уу." },
      { heading: "4. Захиалга цуцлах", body: "Хүргэгч томилогдохоос өмнө захиалгыг цуцлах боломжтой. Томилогдсоны дараа цуцлах тохиолдолд нэмэлт төлбөр гарч болно." },
      { heading: "5. Төлбөр тооцоо", body: "Хүргэлтийн хөлс нь зай, ачааны жин, цаг зэргээс хамаарна. Доод хөлс 5,000₮. Төлбөрийг хүргэлтийн дараа бэлнээр эсвэл шилжүүлгээр төлнө." },
      { heading: "6. Хязгаарлагдмал ачаа", body: "Хууль бус, аюултай, хортой бодис агуулсан болон мал амьтан тээвэрлэхийг хориглоно. Ийм захиалгыг цуцлах эрхийг бид хадгална." },
    ],
  },
  privacy: {
    title: "Нууцлалын бодлого",
    icon: Lock,
    content: [
      { heading: "1. Мэдээлэл цуглуулах", body: "Бид таны нэр, утасны дугаар болон хүргэлтийн хаягийг захиалга хийх зорилгоор цуглуулна. Бусад хувийн мэдээллийг цуглуулдаггүй." },
      { heading: "2. Мэдээлэл ашиглах", body: "Таны мэдээллийг зөвхөн захиалгыг амжилттай хүргэхэд болон харилцагчтай холбоо барихад ашиглана. Гуравдагч этгээдэд хуваалцахгүй." },
      { heading: "3. Мэдээллийн аюулгүй байдал", body: "Таны өгөгдлийг Supabase платформд шифрлэгдсэн байдлаар хадгалдаг. PIN болон Pattern кодыг зөвхөн таны төхөөрөмжид хадгална." },
      { heading: "4. Мэдээлэл устгах", body: `Өөрийн бүртгэл болон мэдээллийг устгахыг хүсвэл ${PHONE_LIST} дугаарт холбогдоно уу.` },
      { heading: "5. Cookie", body: "Бид таны нэвтрэлтийн мэдээллийг браузерийн localStorage-д хадгалдаг. Энэ нь дахин нэвтрэхгүйгээр үйлчилгээг ашиглах боломж олгоно." },
    ],
  },
  about: {
    title: "Бидний тухай",
    icon: Truck,
    content: [
      { heading: "hvrgelt.mn гэж юу вэ?", body: "hvrgelt.mn нь Дархан хотын анхны мобайл хүргэлтийн платформ юм. 2024 оноос эхлэн үйл ажиллагаагаа явуулж байна." },
      { heading: "Манай зорилго", body: "Дарханчуудад хурдан, найдвартай, хямд хүргэлтийн үйлчилгээг нэг дороос санал болгох. 30 секундэд захиалга өгч, 30 минутад хүлээж авна." },
      { heading: "Хамт олон", body: "Бид 30 гаруй мэргэшсэн хүргэгч, туршлагатай операторуудын хамт ажилладаг. Хотын аль ч цэгт хүргэнэ." },
      { heading: "Холбоо барих", body: `Утас: ${PHONE_LIST}\nБайршил: ${CITY}\nАжлын цаг: ${WORK_HOURS}` },
    ],
  },
  contact: {
    title: "Холбоо барих",
    icon: Phone,
    content: [
      { heading: "Утас", body: `${PHONE_LIST}\nӨдөр бүр ${WORK_HOURS} цагт ажилладаг.` },
      { heading: "Байршил", body: `${CITY}, Монгол улс` },
      { heading: "Нийгмийн сүлжээ", body: `Facebook: ${short(SOCIAL.facebook)}\nInstagram: ${short(SOCIAL.instagram)}` },
      { heading: "Санал хүсэлт", body: "Үйлчилгээний чанарыг сайжруулахад туслах санал хүсэлтээ манай Facebook хуудсаар илгээнэ үү." },
    ],
  },
};

/** Үйлчилгээний нөхцөл, нууцлал, бидний тухай, холбоо барих */
export function LegalPage({ page, onBack }: { page: LegalKey; onBack: () => void }) {
  const p = PAGES[page];
  const Icon = p.icon;
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 pr-2 py-1">
            <ChevronLeft className="w-4 h-4" /> Буцах
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-xl mx-auto w-full px-5 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-extrabold">{p.title}</h1>
        </div>
        <div className="space-y-3">
          {p.content.map((section) => (
            <section key={section.heading} className="bg-card border border-border rounded-2xl p-4 space-y-1.5">
              <h2 className="text-[15px] font-bold">{section.heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <footer className="border-t border-border px-5 py-4 text-xs text-muted-foreground/70 text-center">
        © {new Date().getFullYear()} {SITE}
      </footer>
    </div>
  );
}
