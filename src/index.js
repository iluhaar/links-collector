const answer = "Link is added";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

addEventListener("scheduled", (event) => {
  event.waitUntil(scheduled(event));
});

async function scheduled(event) {
  await notifyUsers();
}

async function notifyUsers() {
  const allKeys = await LINKS.list();

  const allLinks = [];

  for (const key of allKeys.keys) {
    const requestedLink = await LINKS.get(key.name);

    allLinks.push(JSON.parse(requestedLink));
  }

  for (const link of allLinks) {
    const chatId = link.id;

    const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=Name: ${link.key}, Url:${link.url}`;
    await fetch(url); // No need to parse response
  }
}

async function getLink2Map(key, chatId = 128686155) {
  const requestedLink = await LINKS.get(key);
  const parsedData = JSON.parse(requestedLink);
  if (chatId === parsedData.id) {
    const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=Name: ${parsedData.key}, Url:${parsedData.url}`;
    await fetch(url); // No need to parse response
  }
}

async function mapAllLinks(links, chatId) {
  return Promise.all(
    links.keys.map(async (i) => {
      const data = await getLink2Map(i.name, chatId);
    }),
  );
}

async function getAllLinks(chatId) {
  const links = await LINKS.list();

  await mapAllLinks(links, chatId);
}

async function addNewLink(link, chatId) {
  const id = chatId;
  const key = link.trim().split(" ")[0];
  const userUrl = link.trim().split(" ")[1];
  const data = {
    id: id,
    key: key,
    url: userUrl,
  };

  // Store the payload in a KV namespace
  await LINKS.put(key, JSON.stringify(data));

  const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${answer}`;
  await fetch(url); // No need to parse response
}

async function getLink(key, chatId) {
  const requestedLink = await LINKS.get(key.trim().split(" ")[1]);
  const parsedData = JSON.parse(requestedLink);

  const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=Name: ${parsedData.key}, Url:${parsedData.url}`;
  await fetch(url); // No need to parse response
}

async function deleteLink(key, chatId) {
  const deletedLink = await LINKS.delete(key.trim().split(" ")[1]);

  const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text= The link ${
    key.trim().split(" ")[1]
  } was deleted`;
  await fetch(url); // No need to parse response
}

async function handleWelcomeMessage(userName, chatId) {
  const message = `Hi, ${userName}, I can store your links!
  1. To add the link just send me the URL and name for this link separated by space;
  2. To get all the links use '/all' command;
  3. To get url by link name use '/get {name}' command;
  4. To delete use /del {name} command.`;

  const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${message}`;
  await fetch(url); // No need to parse response
}

async function handleRequest(request) {
  if (request.method === "POST") {
    // Extract the JSON payload from the request body
    const { message } = await request.json();

    const isCommand = /^\//.test(message.text);

    const chatId = message?.chat?.id;

    const userName = message?.chat?.first_name;

    if (isCommand) {
      const command = message.text.trim().split(" ")[0];

      if (command === "/all") {
        await getAllLinks(chatId);

        return new Response("OK");
      } else if (command === "/test") {
        const url = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${JSON.stringify(
          message,
        )}`;
        await fetch(url); // No need to parse response
      } else if (command === "/start") {
        await handleWelcomeMessage(userName, chatId);

        return new Response("Ok");
      } else if (command === "/get") {
        await getLink(message.text, chatId);
        return new Response("OK");

        // FIXME: this command doet not work now
      } else if (command === "/del") {
        await deleteLink(message.text, chatId);

        return new Response("Ok");
      }
    } else {
      await addNewLink(message.text, chatId);
      return new Response("OK");
    }

    // Return a success response
    return new Response("Data stored successfully!", { status: 200 });
  }

  // Return a 405 Method Not Allowed response if the request method is not POST
  return new Response("Method Not Allowed", { status: 405 });
}
