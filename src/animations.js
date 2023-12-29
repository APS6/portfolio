import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import SplitType from 'split-type'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

document.querySelector("#pLink").addEventListener("click", () => {
    gsap.to(window, { duration: 0.5, scrollTo: "#portfolio" });
});

document.querySelectorAll(".para-animate").forEach((para) => {
    const text = new SplitType(para, { types: ["chars", "words"] })

    gsap.fromTo(text.chars, {
        x: 20,
        opacity: .01,
    }, {
        duration: 0.5,
        opacity: 1,
        x: 0,
        stagger: 0.02,
        scrollTrigger: {
            trigger: para,
            start: "top 90%",
            end: "top 25%",
            scrub: true,
        }
    })
})

gsap.to("#marquee", {
    scrollTrigger: {
        trigger: "#marquee",
        scrub: true,
        end: "top 10%",
    },
    ease: "sine.inOut",
    xPercent: -70,
    x: 0,
});