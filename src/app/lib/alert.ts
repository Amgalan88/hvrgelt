// Шинэ захиалга ирэхэд жолоочийн утсыг дуугаргаж, чичиргээ өгнө.
//
// Web push-ийн мэдэгдлийн дууг браузер өөрөө сонгодог тул апп нээлттэй
// үед энд өөрсдөө WebAudio-гоор дохио гаргана. (Апп хаалттай үеийн
// найдвартай дуут дохионд Capacitor Local Notifications хэрэгтэй.)

let ctx: AudioContext | null = null;

function beep(freq: number, startAt: number, duration: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** Дуут дохио + чичиргээ — шинэ захиалга томилогдоход */
export function alertNewOrder() {
  // Чичиргээ (Android дээр ажиллана; iOS Safari дэмждэггүй)
  try {
    navigator.vibrate?.([300, 120, 300, 120, 500]);
  } catch {
    /* дэмжихгүй төхөөрөмж */
  }

  // Дуут дохио — хэрэглэгч аппад нэг ч удаа хүрсэн байх шаардлагатай
  try {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    beep(880, t, 0.18);
    beep(1175, t + 0.22, 0.18);
    beep(880, t + 0.44, 0.26);
  } catch {
    /* аудио боломжгүй */
  }
}
