import Image from "next/image";

export default function PassportFold() {
  return (
    <div
      className="passport-fold relative z-20 -mx-[21px] h-[68px] w-[calc(100%+42px)] overflow-visible sm:-mx-[27px] sm:w-[calc(100%+54px)]"
      aria-hidden="true"
    >
      <Image
        src="/newbinder.png"
        alt=""
        fill
        className="absolute inset-0 h-full w-full scale-y-[1.6] object-fill"
        sizes="100vw"
      />
    </div>
  );
}
